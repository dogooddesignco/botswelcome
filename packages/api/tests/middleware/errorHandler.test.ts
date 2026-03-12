import { describe, it, expect, vi } from 'vitest';
import { AppError, errorHandler } from '../../src/middleware/errorHandler';
import type { Request, Response, NextFunction } from 'express';

function mockRes() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

const mockReq = {} as Request;
const mockNext = vi.fn() as NextFunction;

describe('AppError', () => {
  it('should create error with correct status and code', () => {
    const err = new AppError(400, 'Bad input', 'BAD_REQUEST');
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('BAD_REQUEST');
    expect(err.message).toBe('Bad input');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
  });

  it('badRequest should create 400 error', () => {
    const err = AppError.badRequest('Invalid field', { name: ['required'] });
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('BAD_REQUEST');
    expect(err.details).toEqual({ name: ['required'] });
  });

  it('unauthorized should create 401 error', () => {
    const err = AppError.unauthorized();
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('UNAUTHORIZED');
  });

  it('forbidden should create 403 error', () => {
    const err = AppError.forbidden('No access');
    expect(err.statusCode).toBe(403);
    expect(err.message).toBe('No access');
  });

  it('notFound should create 404 error', () => {
    const err = AppError.notFound('Post not found');
    expect(err.statusCode).toBe(404);
  });

  it('conflict should create 409 error', () => {
    const err = AppError.conflict('Already exists');
    expect(err.statusCode).toBe(409);
  });

  it('tooManyRequests should create 429 error', () => {
    const err = AppError.tooManyRequests();
    expect(err.statusCode).toBe(429);
  });
});

describe('errorHandler', () => {
  it('should handle AppError with correct status and response', () => {
    const res = mockRes();
    const err = AppError.badRequest('Invalid email', { email: ['must be valid'] });

    errorHandler(err, mockReq, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: 'Invalid email',
        details: { email: ['must be valid'] },
      },
    });
  });

  it('should handle unknown errors with 500', () => {
    const res = mockRes();
    const err = new Error('Something broke');

    errorHandler(err, mockReq, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'INTERNAL_ERROR',
        }),
      })
    );
  });
});
