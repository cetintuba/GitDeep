// Determine API URL based on environment (Docker vs Local)
const API_BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? `http://${window.location.hostname}:8000/api`
    : '/api'; // fallback for production

// Helper function to get auth token
function getAuthHeader() {
    const token = localStorage.getItem('gitdeep_token');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

export async function analyzeRepository(url, onProgress) {
    // 1. Start the task
    const response = await fetch(`${API_BASE_URL}/analyze`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader()
        },
        body: JSON.stringify({ url })
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.detail || 'Analysis failed to start');
    }

    // If it was cached, return the result immediately
    if (data.task_id === 'cached') {
        return data.result;
    }

    // 2. Poll for results 
    const taskId = data.task_id;
    return await pollTaskStatus(taskId, onProgress);
}

async function pollTaskStatus(taskId, onProgress) {
    const maxRetries = 60; // 60 * 5s = 5 minutes timeout
    let retries = 0;

    while (retries < maxRetries) {
        const response = await fetch(`${API_BASE_URL}/analyze/${taskId}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Polling failed');
        }

        if (data.status === 'success') {
            return data.result;
        } else if (data.status === 'failed') {
            throw new Error(data.message || 'Analysis failed during processing');
        } else {
            // Pending or Processing
            if (onProgress && data.message) {
                onProgress(data.message);
            }
        }

        // Wait 5 seconds before polling again
        await new Promise(r => setTimeout(r, 5000));
        retries++;
    }

    throw new Error('Analysis timed out after 5 minutes.');
}

export async function getHistory() {
    const response = await fetch(`${API_BASE_URL}/auth/me/history`, {
        headers: getAuthHeader()
    });

    if (!response.ok) {
        if (response.status === 401) {
            return { history: [] }; // Not logged in
        }
        throw new Error(`History API returned error ${response.status}`);
    }
    return await response.json();
}

export async function login(username, password) {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "Login failed");

    localStorage.setItem('gitdeep_token', data.access_token);
    localStorage.setItem('gitdeep_user', username);
    return data;
}

export async function register(username, password) {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || "Registration failed");
    return data;
}

export function logout() {
    localStorage.removeItem('gitdeep_token');
    localStorage.removeItem('gitdeep_user');
}
