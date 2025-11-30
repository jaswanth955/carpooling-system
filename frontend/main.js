(function(){
  const API_BASE_URL = 'http://127.0.0.1:8000/api';

  async function apiFetch(endpoint, method = 'GET', data = null) {
      const cur = JSON.parse(localStorage.getItem('currentUser') || 'null');
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
          if (response.status === 204) return {};
          const result = await response.json();
          if (!response.ok) {
              let errorMessage = result.detail || result.error || JSON.stringify(result);
              throw new Error(errorMessage);
          }
          return result;  
      } catch (error) {
          console.error("API Fetch Error:", endpoint, error);
          throw error;
      }
  }

  window.app = {
      currentUser: () => JSON.parse(localStorage.getItem('currentUser') || 'null'),
      apiFetch: apiFetch,
      getData: (endpoint, queryParams = {}) => {
          const queryString = new URLSearchParams(queryParams).toString();
          return apiFetch(`${endpoint}/?${queryString}`);
      },
      saveData: (endpoint, data) => apiFetch(`${endpoint}/`, 'POST', data),
      updateData: (endpoint, id, data) => apiFetch(`${endpoint}/${id}/`, 'PATCH', data),
      deleteData: (endpoint, id) => apiFetch(`${endpoint}/${id}/delete/`, 'DELETE'),
      
      logout: () => {
          localStorage.removeItem('currentUser');
          window.location.href = 'index.html';
      },
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
        setTimeout(() => {
          const bsAlert = bootstrap.Alert.getInstance(alertDiv) || new bootstrap.Alert(alertDiv);
          bsAlert.close();
        }, 4000);
      }
  };

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