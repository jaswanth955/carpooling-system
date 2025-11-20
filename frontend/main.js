(function(){
  // --- Global API Setup ---
  // IMPORTANT: This URL MUST match your Django server address
  const API_BASE_URL = 'http://127.0.0.1:8000/api';

  /** * Generic API Fetcher function.
   * Handles request configuration, JSON parsing, and basic error checking.
   */
  async function apiFetch(endpoint, method = 'GET', data = null) {
      const cur = JSON.parse(localStorage.getItem('currentUser') || 'null');
      // NOTE: Authentication (JWT token) headers would be added here in a production app.
      // For this demo, we rely on the body data for user IDs.

      const headers = {
          'Content-Type': 'application/json',
      };

      const config = {
          method,
          headers,
          body: data ? JSON.stringify(data) : null,
      };

      try {
          const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
          
          if (response.status === 204) return {}; // Handle No Content responses (like successful DELETE)

          const result = await response.json();
          
          if (!response.ok) {
              // Throw API errors back (e.g., from Django serializers/views)
              let errorMessage = result.detail || result.error || JSON.stringify(result);
              throw new Error(errorMessage);
          }
          return result;

      } catch (error) {
          console.error("API Fetch Error:", endpoint, error);
          throw error;
      }
  }

  // 1. Global App Helper Functions (CRUD Operations)
  window.app = {
      currentUser: () => JSON.parse(localStorage.getItem('currentUser') || 'null'),

      // Expose apiFetch for custom calls
      apiFetch: apiFetch,

      // Data Access using Django API endpoints
      getData: (endpoint, queryParams = {}) => {
          const queryString = new URLSearchParams(queryParams).toString();
          return apiFetch(`${endpoint}/?${queryString}`);
      },
      // Note: POST requests usually omit the trailing slash if the endpoint is a list view
      saveData: (endpoint, data) => apiFetch(`${endpoint}/`, 'POST', data),
      // PATCH/DELETE requires the primary key (id) in the URL
      updateData: (endpoint, id, data) => apiFetch(`${endpoint}/${id}/`, 'PATCH', data),
      deleteData: (endpoint, id) => apiFetch(`${endpoint}/${id}/delete/`, 'DELETE'),

      // Session
      logout: () => {
          localStorage.removeItem('currentUser');
          window.location.href = 'index.html';
      },
      // Global notification handler (retained)
      showNotification: (message, type = 'info') => {
        const container = document.getElementById('notificationContainer');
        if (!container) return console.warn('Notification container not found.');
        
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show w-100 mb-2`;
        alertDiv.role = 'alert';
        alertDiv.innerHTML = `
          ${message}
          <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        
        container.appendChild(alertDiv);
        
        // Auto-dismiss after 4 seconds
        setTimeout(() => {
          const bsAlert = bootstrap.Alert.getInstance(alertDiv) || new bootstrap.Alert(alertDiv);
          bsAlert.close();
        }, 4000);
      }
  };

  // --- Auth Check and Redirect ---
  document.addEventListener('DOMContentLoaded', () => {
    const cur = app.currentUser();
    if(cur){
      const path = window.location.pathname.split('/').pop();
      if(path === 'index.html' || path === '' || path === 'login.html' || path === 'signup.html'){
        if(cur.role === 'admin') window.location.href = 'admin.html';
        else if(cur.role === 'driver') window.location.href = 'driver.html';
        else window.location.href = 'user.html';
      }
    }

    // attach logout buttons
    const btns = document.querySelectorAll('.logoutBtn');
    btns.forEach(b => b.addEventListener('click', (e) => {
      e.preventDefault();
      app.logout();
    }));
  });
})();