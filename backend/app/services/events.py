"""In-process pub/sub used for Server-Sent Events (``GET /api/stream``).

Sync request handlers run in a thread-pool, so ``publish`` hands events to the asyncio loop thread-safely.
If no loop / subscriber exists (tests, CLI), publishing is a harmless no-op. The frontend also polls as a fallback.
"""
import asyncio
import threading
from typing import Any, Dict, Optional, Set


class EventBroker:
    def __init__(self) -> None:
        self._subscribers: Set["asyncio.Queue[Dict[str, Any]]"] = set()
        self._loop: Optional[asyncio.AbstractEventLoop] = None
        self._lock = threading.Lock()
        self.published = 0  # counter, useful for tests

    def attach_loop(self, loop: asyncio.AbstractEventLoop) -> None:
        self._loop = loop

    def subscribe(self) -> "asyncio.Queue[Dict[str, Any]]":
        q: "asyncio.Queue[Dict[str, Any]]" = asyncio.Queue(maxsize=100)
        with self._lock:
            self._subscribers.add(q)
        return q

    def unsubscribe(self, q: "asyncio.Queue[Dict[str, Any]]") -> None:
        with self._lock:
            self._subscribers.discard(q)

    def publish(self, event: Dict[str, Any]) -> None:
        self.published += 1
        loop = self._loop
        if loop is None or loop.is_closed():
            return
        with self._lock:
            subs = list(self._subscribers)
        for q in subs:
            try:
                loop.call_soon_threadsafe(self._put, q, event)
            except RuntimeError:  # loop closed
                pass

    @staticmethod
    def _put(q: "asyncio.Queue[Dict[str, Any]]", event: Dict[str, Any]) -> None:
        try:
            q.put_nowait(event)
        except asyncio.QueueFull:  # slow consumer: drop (client also polls)
            pass


broker = EventBroker()
