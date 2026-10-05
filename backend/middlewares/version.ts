import type { RequestHandler } from 'express';
import v1Router from '../v1/index.js';

export default function checkVersion(): RequestHandler {
  return (req, res, next) => {
    const version = req.headers['api-v'];
    if (version === 'v1') {
      return v1Router(req, res, next);
    }
    res.status(401).json({
      status: 'error',
      data: null,
      message: 'API version missing or unsupported. Use api-v: v1',
    });
  };
}
