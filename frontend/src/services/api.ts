import { fetchAuthSession } from 'aws-amplify/auth';

// Configuration - to be replaced by Env Vars in real deploy, or auto-config
// For local dev, we might hardcode or use .env
const API_BASE_URL = import.meta.env.VITE_API_URL || "https://api.example.com/v1";

export const apiClient = {
    get: async (path: string) => request('GET', path),
    post: async (path: string, body?: any) => request('POST', path, body),
    put: async (path: string, body?: any) => request('PUT', path, body),
    delete: async (path: string) => request('DELETE', path),
};

async function request(method: string, path: string, body?: any) {
    const session = await fetchAuthSession();
    const token = session.tokens?.idToken?.toString();

    if (!token) {
        throw new Error("No authenticated session");
    }

    const headers: HeadersInit = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
    };

    const response = await fetch(`${API_BASE_URL}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });

    if (response.status === 401) {
        // Handle unauthorized - maybe reload or redirect
        // window.location.href = '/'; 
        throw new Error("Unauthorized");
    }

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `Request failed: ${response.status}`);
    }

    return response.json();
}

export const uploadFile = async (presignedUrl: string, file: File, contentType: string) => {
    // Direct S3 Upload
    const res = await fetch(presignedUrl, {
        method: 'PUT',
        body: file,
        headers: {
            'Content-Type': contentType
        }
    });
    if (!res.ok) throw new Error("Upload failed");
};
