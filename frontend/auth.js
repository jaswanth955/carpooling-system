document.addEventListener('DOMContentLoaded', ()=>{
  const signupForm = document.getElementById('signupForm');
  const loginForm = document.getElementById('loginForm');

  if(signupForm){
    signupForm.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const name = document.getElementById('name').value.trim();
      const phone_number = document.getElementById('phone_number').value.trim();
      const email = document.getElementById('email').value.trim().toLowerCase();
      const password = document.getElementById('password').value;
      const role = document.getElementById('role').value;

      const userData = {
          email,
          password,
          name,
          phone_number,
          role,
      };
      
      try {
          // POST to Django API signup endpoint
          const response = await app.saveData('/users/signup', userData);

          // The response body contains the new UserProfile object
          const fullUserData = { id: response.id, name: response.first_name, email: response.email, role: response.role };
          localStorage.setItem('currentUser', JSON.stringify(fullUserData));
          
          app.showNotification(`Welcome, ${name}! Your account is ready.`, 'success');

          // Redirect based on role
          if(role==='admin') window.location='admin.html';
          else if(role==='driver') window.location='driver.html';
          else window.location='user.html';

      } catch (error) {
          console.error("Signup failed:", error);
          const errorMsg = error.message.includes('email') 
                          ? 'Email already registered or invalid.' 
                          : 'Account creation failed. Check console.';
          app.showNotification(errorMsg, 'danger');
      }
    });
  }

  if(loginForm){
    loginForm.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const email = document.getElementById('email').value.trim().toLowerCase();
      const password = document.getElementById('password').value; 
      
      const loginData = { email, password };

      try {
          // POST to Django API login endpoint
          const response = await app.saveData('/users/login', loginData);
          
          // The response body contains the UserProfile object
          const fullUserData = { id: response.id, name: response.first_name, email: response.email, role: response.role };
          localStorage.setItem('currentUser', JSON.stringify(fullUserData));
          
          app.showNotification(`Welcome back, ${response.first_name}!`, 'success');

          if(fullUserData.role==='admin') window.location='admin.html';
          else if(fullUserData.role==='driver') window.location='driver.html';
          else window.location='user.html';
          
      } catch (error) {
          console.error("Login failed:", error);
          app.showNotification('Invalid email or password.', 'danger'); 
      }
    });
  }
});