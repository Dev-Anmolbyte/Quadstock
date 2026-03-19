import request from 'supertest';
import app from '../src/app.js';
import mongoose from 'mongoose';

describe('User API', () => {
    it('should return API is running', async () => {
        const res = await request(app).get('/');
        expect(res.statusCode).toEqual(200);
        expect(res.text).toBe("API is running...");
    });
});
