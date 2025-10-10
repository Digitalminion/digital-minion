/**
 * Abstraction for Microsoft Graph API client.
 *
 * This interface allows for dependency injection and mocking in tests.
 * Provides a thin wrapper around the Graph SDK with only the methods we need.
 */
export interface IGraphClient {
  /**
   * Execute a GET request to the Graph API
   */
  get<T>(endpoint: string, options?: GraphRequestOptions): Promise<T>;

  /**
   * Execute a POST request to the Graph API
   */
  post<T>(endpoint: string, body: any, options?: GraphRequestOptions): Promise<T>;

  /**
   * Execute a PATCH request to the Graph API
   */
  patch<T>(endpoint: string, body: any, options?: GraphRequestOptions): Promise<T>;

  /**
   * Execute a PUT request to the Graph API
   */
  put<T>(endpoint: string, body: any, options?: GraphRequestOptions): Promise<T>;

  /**
   * Execute a DELETE request to the Graph API
   */
  delete(endpoint: string, options?: GraphRequestOptions): Promise<void>;

  /**
   * Upload content (for file uploads)
   */
  putContent<T>(endpoint: string, content: Buffer | string, contentType?: string): Promise<T>;
}

/**
 * Options for Graph API requests
 */
export interface GraphRequestOptions {
  /** HTTP headers to include in the request */
  headers?: Record<string, string>;

  /** Query parameters */
  query?: Record<string, string | number | boolean>;

  /** OData select fields */
  select?: string[];

  /** OData expand fields */
  expand?: string[];

  /** OData filter */
  filter?: string;
}

/**
 * Production implementation using @microsoft/microsoft-graph-client
 */
export class GraphClient implements IGraphClient {
  private client: any;

  constructor(accessToken: string) {
    // Lazy-require to avoid bundling issues if not used
    const { Client } = require('@microsoft/microsoft-graph-client');

    this.client = Client.init({
      authProvider: (done: any) => {
        done(null, accessToken);
      },
    });
  }

  async get<T>(endpoint: string, options?: GraphRequestOptions): Promise<T> {
    let request = this.client.api(endpoint);
    request = this.applyOptions(request, options);
    return await request.get();
  }

  async post<T>(endpoint: string, body: any, options?: GraphRequestOptions): Promise<T> {
    let request = this.client.api(endpoint);
    request = this.applyOptions(request, options);
    return await request.post(body);
  }

  async patch<T>(endpoint: string, body: any, options?: GraphRequestOptions): Promise<T> {
    let request = this.client.api(endpoint);
    request = this.applyOptions(request, options);
    return await request.patch(body);
  }

  async put<T>(endpoint: string, body: any, options?: GraphRequestOptions): Promise<T> {
    let request = this.client.api(endpoint);
    request = this.applyOptions(request, options);
    return await request.put(body);
  }

  async delete(endpoint: string, options?: GraphRequestOptions): Promise<void> {
    let request = this.client.api(endpoint);
    request = this.applyOptions(request, options);
    await request.delete();
  }

  async putContent<T>(endpoint: string, content: Buffer | string, contentType: string = 'application/octet-stream'): Promise<T> {
    let request = this.client.api(endpoint);
    request = request.header('Content-Type', contentType);
    return await request.put(content);
  }

  private applyOptions(request: any, options?: GraphRequestOptions): any {
    if (!options) return request;

    if (options.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        request = request.header(key, value);
      });
    }

    if (options.query) {
      Object.entries(options.query).forEach(([key, value]) => {
        request = request.query(key, value);
      });
    }

    if (options.select && options.select.length > 0) {
      request = request.select(options.select.join(','));
    }

    if (options.expand && options.expand.length > 0) {
      request = request.expand(options.expand.join(','));
    }

    if (options.filter) {
      request = request.filter(options.filter);
    }

    return request;
  }
}

/**
 * Mock implementation for testing
 */
export class MockGraphClient implements IGraphClient {
  public requests: Array<{
    method: string;
    endpoint: string;
    body?: any;
    options?: GraphRequestOptions;
  }> = [];

  private responses: Map<string, any> = new Map();

  /**
   * Set a mock response for a specific endpoint
   */
  setMockResponse(endpoint: string, response: any): void {
    this.responses.set(endpoint, response);
  }

  async get<T>(endpoint: string, options?: GraphRequestOptions): Promise<T> {
    this.requests.push({ method: 'GET', endpoint, options });
    return this.getMockResponse(endpoint);
  }

  async post<T>(endpoint: string, body: any, options?: GraphRequestOptions): Promise<T> {
    this.requests.push({ method: 'POST', endpoint, body, options });
    return this.getMockResponse(endpoint);
  }

  async patch<T>(endpoint: string, body: any, options?: GraphRequestOptions): Promise<T> {
    this.requests.push({ method: 'PATCH', endpoint, body, options });
    return this.getMockResponse(endpoint);
  }

  async put<T>(endpoint: string, body: any, options?: GraphRequestOptions): Promise<T> {
    this.requests.push({ method: 'PUT', endpoint, body, options });
    return this.getMockResponse(endpoint);
  }

  async delete(endpoint: string, options?: GraphRequestOptions): Promise<void> {
    this.requests.push({ method: 'DELETE', endpoint, options });
  }

  async putContent<T>(endpoint: string, content: Buffer | string, contentType?: string): Promise<T> {
    this.requests.push({ method: 'PUT_CONTENT', endpoint, body: content });
    return this.getMockResponse(endpoint);
  }

  private getMockResponse<T>(endpoint: string): T {
    if (this.responses.has(endpoint)) {
      return this.responses.get(endpoint);
    }
    throw new Error(`No mock response configured for endpoint: ${endpoint}`);
  }

  /**
   * Clear all recorded requests
   */
  clearRequests(): void {
    this.requests = [];
  }

  /**
   * Get all requests matching a pattern
   */
  getRequests(method?: string, endpointPattern?: RegExp): Array<any> {
    return this.requests.filter(req => {
      if (method && req.method !== method) return false;
      if (endpointPattern && !endpointPattern.test(req.endpoint)) return false;
      return true;
    });
  }
}
