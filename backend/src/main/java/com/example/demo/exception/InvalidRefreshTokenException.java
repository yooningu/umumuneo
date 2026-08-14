package com.example.demo.exception;

// Refresh Token이 없거나, 만료됐거나, 타입이 refresh가 아닐 때
public class InvalidRefreshTokenException extends RuntimeException {
    public InvalidRefreshTokenException(String message) {
        super(message);
    }
}
