import { PR } from '../types/pr';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const createPR = async (pr: PR): Promise<Response> => {
  try {
    const response = await fetch(`${API_BASE_URL}/prs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(pr),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.message || `HTTP error! status: ${response.status}`);
    }

    return response;
  } catch (error) {
    console.error('Error creating PR:', error);
    throw error;
  }
};

export const getPR = async (id: string): Promise<PR | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/prs/${id}`, {
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching PR:', error);
    return null;
  }
};

export const updatePR = async (pr: PR): Promise<Response> => {
  try {
    const response = await fetch(`${API_BASE_URL}/prs/${pr.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(pr),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response;
  } catch (error) {
    console.error('Error updating PR:', error);
    throw error;
  }
};

export const deletePR = async (id: string): Promise<Response> => {
  try {
    const response = await fetch(`${API_BASE_URL}/prs/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response;
  } catch (error) {
    console.error('Error deleting PR:', error);
    throw error;
  }
};

export const listPRs = async (): Promise<PR[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/prs`, {
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching PRs:', error);
    return [];
  }
};
