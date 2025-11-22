// src/services/api.js
// Backend integration for Telegram Mini App

const API_BASE_URL = 'https://your-backend-api.com/api';

// Helper function to get Telegram init data for authentication
function getTelegramInitData() {
    return window.Telegram.WebApp.initData;
}

export const fetchData = async (endpoint) => {
    try {
        const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Telegram-Init-Data': getTelegramInitData(), // Send Telegram auth data
            },
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Fetch error:', error);
        throw error;
    }
};

export const postData = async (endpoint, data) => {
    try {
        const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Telegram-Init-Data': getTelegramInitData(), // Send Telegram auth data
            },
            body: JSON.stringify(data),
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Post error:', error);
        throw error;
    }
};

// Example API calls
export const getUserBalance = async (userId) => {
    return await fetchData(`users/${userId}/balance`);
};

export const claimReward = async (userId) => {
    return await postData(`users/${userId}/claim`, {});
};

export const getUserReferrals = async (userId) => {
    return await fetchData(`users/${userId}/referrals`);
};