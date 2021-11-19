export class HTTPResponseError extends Error {
  constructor(response, ...args) {
    super(
      `HTTP Error Response: ${response.status} ${response.statusText}`,
      ...args
    );
    this.response = response;
  }
}

export class PriceNotFoundError extends Error {
  constructor(message) {
    super(message);
  }
}
