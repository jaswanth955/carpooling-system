// home.js — handles loading summary counts on the home page

console.log('home.js loaded');

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('http://localhost:8000/api/summary/');
        if (!response.ok) {
            throw new Error('Failed to fetch summary data');
        }
        const data = await response.json();
        document.getElementById('totalUsers').textContent = data.total_users;
        document.getElementById('totalRides').textContent = data.total_rides;
        document.getElementById('totalBookings').textContent = data.total_bookings;
    } catch (error) {
        console.error('Error loading summary:', error);
        document.getElementById('totalUsers').textContent = 'Error';
        document.getElementById('totalRides').textContent = 'Error';
        document.getElementById('totalBookings').textContent = 'Error';
    }
});
