"""Domain errors raised by services and translated into the uniform API error format."""
from typing import Any, List, Optional


class ServiceError(Exception):
    status_code = 400
    code = "bad_request"

    def __init__(self, message: str, details: Optional[List[Any]] = None, code: Optional[str] = None):
        super().__init__(message)
        self.message = message
        self.details = details or []
        if code:
            self.code = code


class NotFound(ServiceError):
    status_code = 404
    code = "not_found"


class Conflict(ServiceError):
    status_code = 409
    code = "conflict"


class ValidationFailed(ServiceError):
    status_code = 422
    code = "validation_error"
