import { describe, it, expect, beforeEach } from 'vitest';
import { MockGraphClient } from '../backends/planner/graph-client';

describe('MockGraphClient', () => {
  let mockClient: MockGraphClient;

  beforeEach(() => {
    mockClient = new MockGraphClient();
  });

  describe('GET requests', () => {
    it('should return mocked response', async () => {
      const mockData = { id: '123', name: 'Test Task' };
      mockClient.setMockResponse('/planner/tasks/123', mockData);

      const result = await mockClient.get('/planner/tasks/123');

      expect(result).toEqual(mockData);
    });

    it('should throw error when no mock is set', async () => {
      await expect(
        mockClient.get('/planner/tasks/nonexistent')
      ).rejects.toThrow('No mock response configured');
    });
  });

  describe('POST requests', () => {
    it('should return mocked response', async () => {
      const mockData = { id: '456', name: 'New Task' };
      mockClient.setMockResponse('/planner/tasks', mockData);

      const result = await mockClient.post('/planner/tasks', { name: 'New Task' });

      expect(result).toEqual(mockData);
    });

    it('should record request body', async () => {
      mockClient.setMockResponse('/planner/tasks', { id: '456' });
      const body = { name: 'New Task', notes: 'Test notes' };

      await mockClient.post('/planner/tasks', body);

      const requests = mockClient.getRequests('POST', /tasks/);
      expect(requests).toHaveLength(1);
      expect(requests[0].body).toEqual(body);
    });
  });

  describe('Request tracking', () => {
    it('should track all requests', async () => {
      mockClient.setMockResponse('/tasks/1', { id: '1' });
      mockClient.setMockResponse('/tasks/2', { id: '2' });

      await mockClient.get('/tasks/1');
      await mockClient.get('/tasks/2');

      const requests = mockClient.getRequests('GET', /tasks/);
      expect(requests).toHaveLength(2);
    });

    it('should filter by method', async () => {
      mockClient.setMockResponse('/tasks', { id: '1' });

      await mockClient.post('/tasks', {});
      await mockClient.get('/tasks');

      const getRequests = mockClient.getRequests('GET', /tasks/);
      const postRequests = mockClient.getRequests('POST', /tasks/);

      expect(getRequests).toHaveLength(1);
      expect(postRequests).toHaveLength(1);
    });

    it('should filter by endpoint pattern', async () => {
      mockClient.setMockResponse('/planner/tasks', { id: '1' });
      mockClient.setMockResponse('/planner/plans', { id: 'p1' });

      await mockClient.get('/planner/tasks');
      await mockClient.get('/planner/plans');

      const taskRequests = mockClient.getRequests('GET', /tasks/);
      expect(taskRequests).toHaveLength(1);
    });

    it('should clear requests', async () => {
      mockClient.setMockResponse('/tasks', { id: '1' });

      await mockClient.get('/tasks');
      expect(mockClient.getRequests('GET', /tasks/)).toHaveLength(1);

      mockClient.clearRequests();
      expect(mockClient.getRequests('GET', /tasks/)).toHaveLength(0);
    });
  });
});
