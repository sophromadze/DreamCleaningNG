import { Handler } from '@netlify/functions';
import { app } from '../../server';

export const handler: Handler = async (event, context) => {
  return new Promise((resolve, reject) => {
    const { path, httpMethod, headers, queryStringParameters } = event;

    // Create a mock request object
    const req = {
      method: httpMethod,
      url: path,
      headers: headers,
      query: queryStringParameters,
    };

    // Create a mock response object
    const res = {
      statusCode: 200,
      headers: {},
      body: '',
      setHeader: (name: string, value: string) => {
        res.headers[name] = value;
      },
      send: (body: string) => {
        res.body = body;
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: res.body,
        });
      },
    };

    // Handle the request
    app(req, res, (err: any) => {
      if (err) {
        reject(err);
      }
    });
  });
}; 