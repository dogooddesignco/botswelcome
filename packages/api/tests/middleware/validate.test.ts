import { describe, it, expect, vi } from 'vitest';
import { validate } from '../../src/middleware/validate';
import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';

function createMocks(body: unknown = {}, query: unknown = {}, params: unknown = {}) {
  const req = { body, query, params } as Request;
  const res = {} as Response;
  const next = vi.fn() as NextFunction;
  return { req, res, next };
}

describe('validate middleware', () => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
  });

  it('should pass valid body data and call next', () => {
    const { req, res, next } = createMocks({
      email: 'test@example.com',
      password: 'password123',
    });

    validate(schema)(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.body).toEqual({
      email: 'test@example.com',
      password: 'password123',
    });
  });

  it('should strip extra fields from validated data', () => {
    const { req, res, next } = createMocks({
      email: 'test@example.com',
      password: 'password123',
      extraField: 'should be stripped',
    });

    validate(schema)(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.body).not.toHaveProperty('extraField');
  });

  it('should call next with AppError on invalid data', () => {
    const { req, res, next } = createMocks({
      email: 'not-an-email',
      password: 'short',
    });

    validate(schema)(req, res, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        code: 'BAD_REQUEST',
        message: 'Validation failed',
      })
    );
  });

  it('should include field-level error details', () => {
    const { req, res, next } = createMocks({
      email: 'bad',
      password: '123',
    });

    validate(schema)(req, res, next);

    const error = (next as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(error.details).toHaveProperty('email');
    expect(error.details).toHaveProperty('password');
  });

  it('should validate query params when target is query', () => {
    const querySchema = z.object({
      page: z.coerce.number().min(1),
    });

    const { req, res, next } = createMocks({}, { page: '5' });

    validate(querySchema, 'query')(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.query).toEqual({ page: 5 });
  });

  it('should validate params when target is params', () => {
    const paramsSchema = z.object({
      id: z.string().uuid(),
    });

    const { req, res, next } = createMocks({}, {}, { id: '550e8400-e29b-41d4-a716-446655440000' });

    validate(paramsSchema, 'params')(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });
});
