const express = require('express');
const request = require('supertest');

process.env.SECRET = process.env.SECRET || 'test-secret';

jest.mock('../models/user.js', () => {
  function MockUser(data) {
    Object.assign(this, data);
    this.withoutPassword = jest.fn(() => ({
      _id: 'user-123',
      email: this.email,
      firstName: this.firstName,
      lastName: this.lastName,
      access: this.access,
      isVerified: this.isVerified,
    }));
  }

  MockUser.findOne = jest.fn();

  MockUser.prototype.save = jest.fn(function save(callback) {
    callback(null, this);
  });

  return MockUser;
});

const User = require('../models/user.js');
const authRouter = require('../routes/authRouter.js');

describe('POST /auth/signup', () => {
  let app;

  beforeEach(() => {
    jest.clearAllMocks();

    app = express();
    app.use(express.json());
    app.use('/auth', authRouter);

    app.use((err, req, res, next) => {
      res.status(res.statusCode || 500).send({ errMsg: err.message });
    });
  });

  it('returns 403 when password is shorter than 8 characters', async () => {
    User.findOne.mockImplementation((query, callback) => callback(null, null));

    const response = await request(app)
      .post('/auth/signup')
      .send({
        email: 'tester@example.com',
        password: 'short',
        firstName: 'Test',
        lastName: 'User',
        address: {
          line1: '123 Test St',
          line2: '',
          city: 'Testville',
          state: 'tn',
          zip: '12345',
        },
      });

    expect(response.status).toBe(403);
    expect(response.body.errMsg).toBe('Password must be at least 8 chars');
  });

  it('returns 403 when email is already taken', async () => {
    User.findOne.mockImplementation((query, callback) =>
      callback(null, { _id: 'existing-user' })
    );

    const response = await request(app)
      .post('/auth/signup')
      .send({
        email: 'tester@example.com',
        password: 'verysecurepass',
        firstName: 'Test',
        lastName: 'User',
        address: {
          line1: '123 Test St',
          line2: '',
          city: 'Testville',
          state: 'tn',
          zip: '12345',
        },
      });

    expect(response.status).toBe(403);
    expect(response.body.errMsg).toBe('That email is already taken');
    expect(User.prototype.save).not.toHaveBeenCalled();
  });

  it('returns 201 and token when payload is valid', async () => {
    User.findOne.mockImplementation((query, callback) => callback(null, null));

    const response = await request(app)
      .post('/auth/signup')
      .send({
        email: 'tester@example.com',
        password: 'verysecurepass',
        firstName: 'Test',
        lastName: 'User',
        address: {
          line1: '123 Test St',
          line2: '',
          city: 'Testville',
          state: 'tn',
          zip: '12345',
        },
      });

    expect(response.status).toBe(201);
    expect(typeof response.body.token).toBe('string');
    expect(response.body.user).toEqual(
      expect.objectContaining({
        email: 'tester@example.com',
        firstName: 'Test',
        lastName: 'User',
        access: 'member',
        isVerified: false,
      })
    );
  });
});
