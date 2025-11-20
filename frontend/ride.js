// rides.js - posting rides, searching, booking
// NOTE: All data retrieval and saving now uses the Django REST API via the global 'app' functions.

document.addEventListener('DOMContentLoaded', ()=>{
  const postRideForm = document.getElementById('postRideForm');
  const myRidesDiv = document.getElementById('myRides');
  const searchForm = document.getElementById('searchForm');
  const resultsDiv = document.getElementById('results');
  const myBookingsDiv = document.getElementById('myBookings');
  const seatBookingModal = document.getElementById('seatBookingModal');
  const seatBookingForm = document.getElementById('seatBookingForm');

  const cur = app.currentUser();
  if(!cur){
    const path = window.location.pathname.split('/').pop();
    if(['admin.html','driver.html','user.html'].includes(path)){
      window.location='login.html';
      return;
    }
  }
  
  const RIDES_ENDPOINT = '/rides';
  const BOOKINGS_ENDPOINT = '/bookings';
  const USERS_ENDPOINT = '/users';

  // Helper to count confirmed bookings
  async function getConfirmedBookingCount(rideId) {
      // Fetch bookings filtered by ride and status
      const bookings = await app.getData(BOOKINGS_ENDPOINT, { ride_id: rideId, status: 'confirmed' });
      return bookings.length;
  }
  
  // Helper to calculate the average rating for a ride
  async function getAverageRating(rideId) {
      // Fetch bookings filtered by ride and status
      const bookings = await app.getData(BOOKINGS_ENDPOINT, { ride_id: rideId, status: 'rated' });

      const ratedBookings = bookings.filter(b => b.legroom_rating || b.cleanliness_rating || b.driving_smoothness_rating || b.temperature_comfort_rating);
      if (ratedBookings.length === 0) return 'N/A';

      const totalRating = ratedBookings.reduce((sum, b) => {
          const ratings = [b.legroom_rating, b.cleanliness_rating, b.driving_smoothness_rating, b.temperature_comfort_rating].filter(r => r);
          return sum + (ratings.reduce((a, c) => a + c, 0) / ratings.length);
      }, 0);
      const average = (totalRating / ratedBookings.length).toFixed(1);
      return `${average} / 5 (${ratedBookings.length} reviews)`;
  }

  // driver: post ride
  if(postRideForm){
    postRideForm.addEventListener('submit', async (e)=>{
      e.preventDefault();
      try{
        const origin = document.getElementById('origin_name').value.trim();
        const dest = document.getElementById('dest_name').value.trim();
        const depart_time = document.getElementById('depart_time').value;
        const total_seats = parseInt(document.getElementById('total_seats').value,10)||1;
        const price_per_seat = parseFloat(document.getElementById('price_per_seat').value)||0;
        
        // Vehicle info is part of UserProfile, but we send it for display ease.
        const vehicle_company = (document.getElementById('vehicle_company') || {value:''}).value.trim();
        const vehicle_model = (document.getElementById('vehicle_model') || {value:''}).value.trim();
        const vehicle_safety = parseFloat((document.getElementById('vehicle_safety') || {value:0}).value)||0;
        
        const preferences = (document.getElementById('preferences') || {value:''}).value.trim(); 

        const rideData = {
          driver_id: cur.id, // Django expects the driver's User PK
          origin_name: origin,
          dest_name: dest,
          depart_time: depart_time,
          total_seats,
          seats_available: total_seats,
          price_per_seat,
          preferences,
          vehicle_company: vehicle_company,
          vehicle_model: vehicle_model,
          vehicle_safety_rating: vehicle_safety
        };

        await app.saveData('/rides/create', rideData);
        
        document.getElementById('postMsg').textContent = 'Ride posted!'; 
        postRideForm.reset();
        await renderMyRides();
        app.showNotification('Ride posted successfully!', 'success');
      }catch(err){
        console.error('Error posting ride', err);
        document.getElementById('postMsg').textContent = 'Failed to post ride'; 
        app.showNotification('Failed to post ride. Check console for details.', 'danger');
      }
    });
  }

  async function renderMyRides(){
    if(!myRidesDiv) return;
    
    // Fetch rides filtered by the current user's ID
    const rides = await app.getData(RIDES_ENDPOINT, { driver_id: cur.id, status: 'all' });

    if(!rides.length){ myRidesDiv.innerHTML='<p class="smalltext">No rides posted yet.</p>'; return; }
    
    let html = '<table class="table"><tr><th>From</th><th>To</th><th>Depart</th><th>Vehicle</th><th>Seats</th><th>Price</th><th>Status</th><th>Rating</th><th style="min-width: 250px;">Actions</th></tr>';
    
    for (const r of rides) {
      // Vehicle info is now directly in the ride object
      const vehicleInfo = r.vehicle_company ? `${r.vehicle_company} ${r.vehicle_model} (${r.vehicle_safety_rating})` : 'N/A';
      
      const passengerCount = await getConfirmedBookingCount(r.id);
      const rideRating = await getAverageRating(r.id);

      const actionButton = (() => {
          if (r.status === 'open') {
              const buttonsHtml = `<button class="btn btn-outline-primary" onclick="cancelRide('${r.id}')">Cancel</button> 
                      <button class="btn btn-primary" onclick="togglePassengerDetails('${r.id}')">Passengers (${passengerCount})</button> 
                      <button class="btn btn-success" onclick="markRideCompleted('${r.id}')">Reached</button>`;
              return `<div class="d-flex gap-2">${buttonsHtml}</div>`;
          } else if (r.status === 'completed') {
              return `<span class="smalltext text-success">Completed</span>`;
          } else { // cancelled
              return `<span class="smalltext">No action</span>`;
          }
      })();

      // DATA ROW: Get and display ride rating
      html += `<tr><td>${r.origin_name}</td><td>${r.dest_name}</td><td>${new Date(r.depart_time).toLocaleString()}</td><td>${vehicleInfo}</td><td>${r.seats_available}/${r.total_seats}</td><td>${r.price_per_seat}</td><td>${r.status}</td><td>${rideRating}</td><td>${actionButton}</td></tr>`;
      
      html += `<tr id="passengers-details-${r.id}" style="display:none;"><td colspan="9" class="p-0"></td></tr>`;
    }
    html += '</table>';
    myRidesDiv.innerHTML = html;
  }

  // FEATURE: Toggles visibility of the passenger list
  window.togglePassengerDetails = async function(rideId){
      const detailRow = document.getElementById(`passengers-details-${rideId}`);
      const detailCell = detailRow ? detailRow.querySelector('td') : null;

      if (!detailRow || !detailCell) return;

      if (detailRow.style.display === 'none') {
          // Fetch all bookings for this ride
          const bookings = await app.getData(BOOKINGS_ENDPOINT, { ride_id: rideId });
          
          let confirmedBookings = bookings.filter(b => b.status === 'confirmed' || b.status === 'awaiting_rating' || b.status === 'rated');

          if(!confirmedBookings.length) {
              detailCell.innerHTML = '<p class="smalltext p-3">No confirmed or completed passengers for this ride.</p>';
          } else {
              let html = '<div class="p-3"><h6 class="mb-2">Passenger Details:</h6><table class="table table-sm">';
              html += '<tr><th>Name</th><th>Email</th><th>Seats</th><th>Status</th><th>Rating</th></tr>';
              
              // We rely on the embedded 'passenger' object in the booking serializer
              // No need to fetch all users globally

              confirmedBookings.forEach(b => {
                  const user = b.passenger || {name: 'Unknown', email: 'N/A'};

                  let ratingText = '';
                  if (b.status === 'rated') {
                      const ratings = [b.legroom_rating, b.cleanliness_rating, b.driving_smoothness_rating, b.temperature_comfort_rating].filter(r => r);
                      const avg = ratings.length > 0 ? (ratings.reduce((a, c) => a + c, 0) / ratings.length).toFixed(1) : 'N/A';
                      ratingText = `${avg} stars`;
                  } else if (b.status === 'awaiting_rating') {
                      ratingText = 'Awaiting';
                  } else {
                      ratingText = 'N/A';
                  }

                  html += `<tr><td>${user.name}</td><td>${user.email}</td><td>${b.seats_booked}</td><td>${b.status}</td><td>${ratingText}</td></tr>`;
              });
              html += '</table></div>';
              detailCell.innerHTML = html;
          }
          detailRow.style.display = 'table-row';
      } else {
          detailRow.style.display = 'none';
      }
  }
  
  // FEATURE: Mark Ride Completed
  window.markRideCompleted = async function(rideId){
      // Show confirmation modal
      const modal = new bootstrap.Modal(document.getElementById('confirmReachedModal'));
      document.getElementById('confirmReachedBtn').dataset.rideId = rideId;
      modal.show();
  }

  // Handle confirm button in the reached modal (only if element exists)
  const confirmReachedBtn = document.getElementById('confirmReachedBtn');
  if (confirmReachedBtn) {
      confirmReachedBtn.addEventListener('click', async () => {
          const rideId = confirmReachedBtn.dataset.rideId;
          try {
              // Update ride status to completed (Django View handles booking updates internally)
              await app.updateData(RIDES_ENDPOINT, rideId, { status: 'completed' });

              // Hide modal
              const modal = bootstrap.Modal.getInstance(document.getElementById('confirmReachedModal'));
              if (modal) modal.hide();

              await renderMyRides();
              app.showNotification('Ride marked as completed. Passengers can now rate you.', 'success');
          } catch (error) {
              console.error("Error marking ride complete:", error);
              app.showNotification('Failed to complete ride.', 'danger');
          }
      });
  }

  window.cancelRide = async function(rideId){
    if(!confirm('Cancel this ride?')) return;
    
    try {
        // Update ride status to cancelled (Django View handles booking and seat return internally)
        await app.updateData(RIDES_ENDPOINT, rideId, { status: 'cancelled' });
        
        await renderMyRides();
        app.showNotification('Ride successfully cancelled. Associated bookings were also cancelled.', 'success');
    } catch (error) {
        console.error("Error cancelling ride:", error);
        app.showNotification('Failed to cancel ride.', 'danger');
    }
  }

  // user: search rides
  if(searchForm){
    searchForm.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const origin = document.getElementById('search_origin').value.trim();
      const dest = document.getElementById('search_dest').value.trim();
      const date = document.getElementById('search_date').value; 
      
      // Fetch open rides, passing text search filters to Django
      const results = await app.getData(RIDES_ENDPOINT, { 
          origin: origin, 
          dest: dest,
          status: 'open'
      });
      
      // Filtering by date is done client-side 
      const filteredResults = results.filter(r=>{
          const matchDate = date? (new Date(r.depart_time).toISOString().slice(0,10)===date) : true;
          return r.seats_available > 0 && matchDate;
      });
      
      await renderResults(filteredResults);
      if(filteredResults.length === 0) app.showNotification('No rides found matching your criteria.', 'info');
    });
  }

  async function renderResults(results){
    if(!resultsDiv) return;
    if(!results.length){ resultsDiv.innerHTML = '<p class="smalltext">No rides found.</p>'; return; }

    // Find the maximum vehicle safety rating
    const maxSafetyRating = Math.max(...results.map(r => parseFloat(r.vehicle_safety_rating) || 0));

    let html = '';
    results.forEach(r=>{
      const driver = r.driver || {name:'Driver'};
      let vinfo = r.vehicle_company ? `${r.vehicle_company} ${r.vehicle_model} (${r.vehicle_safety_rating})` : 'N/A';

      // Check if this ride has the highest safety rating
      const isSafest = parseFloat(r.vehicle_safety_rating) === maxSafetyRating && maxSafetyRating > 0;
      if (isSafest) {
        vinfo += ' - the car is safest of available';
      }

      // Apply class for highlighting if safest
      const cardClass = isSafest ? 'card mb-2 p-2 safest-ride' : 'card mb-2 p-2';

      // Updated button to call showBookingModal
      html += `<div class="${cardClass}"><strong>${r.origin_name} → ${r.dest_name}</strong><div class="smalltext">Depart: ${new Date(r.depart_time).toLocaleString()} | Seats: ${r.seats_available} | Price: ${r.price_per_seat}</div><div style="margin-top:8px"><button class="btn btn-primary" onclick="showBookingModal('${r.id}')">Book</button></div><div class="smalltext">Driver: ${driver.name}</div><div class="smalltext">Vehicle: ${vinfo}</div></div>`;
    });
    resultsDiv.innerHTML = html;
  }
  
  // Function to display the modal (no change in logic, just now asynchronous)
  window.showBookingModal = async function(rideId){
    const cur = app.currentUser();
    if(!cur) return window.location='login.html';

    // Fetch specific ride details to ensure real-time seat count
    const ride = await app.getData(`${RIDES_ENDPOINT}/${rideId}`);

    if(!ride) return app.showNotification('Ride not found', 'danger');
    if(ride.seats_available<=0) return app.showNotification('No seats available', 'warning');

    // Populate modal fields
    document.getElementById('modalRideId').value = rideId;
    document.getElementById('seatsToBook').max = ride.seats_available;
    document.getElementById('seatsToBook').value = 1;

    // Populate detailed ride information
    const driver = ride.driver || {name:'Driver'};
    const vinfo = ride.vehicle_company ? `${ride.vehicle_company} ${ride.vehicle_model} (${ride.vehicle_safety_rating})` : 'N/A';

    const rideDetailsHtml = `
      <div class="card p-3">
        <div class="mb-2"><strong>Route:</strong> ${ride.origin_name} → ${ride.dest_name}</div>
        <div class="mb-2"><strong>Departure:</strong> ${new Date(ride.depart_time).toLocaleString()}</div>
        <div class="mb-2"><strong>Price per seat:</strong> ${ride.price_per_seat}</div>
        <div class="mb-2"><strong>Driver:</strong> ${driver.name}</div>
        <div class="mb-2"><strong>Vehicle:</strong> ${vinfo}</div>
        <div class="mb-2"><strong>Preferences:</strong> ${ride.preferences || 'None'}</div>
      </div>
    `;

    document.getElementById('rideDetailsContent').innerHTML = rideDetailsHtml;
    document.getElementById('seatsAvailableText').textContent = `${ride.seats_available}`;

    // Show the modal
    const modal = new bootstrap.Modal(seatBookingModal);
    modal.show();
  }

  // Handles the modal form submission
  if(seatBookingForm){
    seatBookingForm.addEventListener('submit', async (e)=>{
      e.preventDefault();

      const rideId = document.getElementById('modalRideId').value;
      const requestedSeats = parseInt(document.getElementById('seatsToBook').value, 10);
      const cur = app.currentUser();
      
      if (isNaN(requestedSeats) || requestedSeats <= 0) {
          return app.showNotification('Invalid number of seats entered.', 'warning');
      }
      
      const bookingData = {
          ride_id: rideId,
          passenger_id: cur.id, // Django expects User PK
          seats_booked: requestedSeats,
          status:'confirmed',
          payment_mode:'offline',
      };
      
      try {
          // POST to Django API booking endpoint
          await app.saveData(BOOKINGS_ENDPOINT, bookingData);
          
          // Hide modal and show success
          const modal = bootstrap.Modal.getInstance(seatBookingModal);
          if(modal) modal.hide();
          
          app.showNotification(`Booked ${requestedSeats} seat(s)! Payment: Offline`, 'success');
          
          // refresh UI
          if(document.getElementById('results')) document.getElementById('results').innerHTML = '';
          await renderMyBookings();
          
      } catch (error) {
          // Display detailed error from Django 
          app.showNotification(error.message, 'danger');
      }
    });
  }


  async function renderMyBookings(){
    if(!myBookingsDiv) return;
    const cur = app.currentUser();
    
    // Fetch all bookings for the current user
    const allBookings = await app.getData(BOOKINGS_ENDPOINT, { passenger_id: cur.id });
    if(!allBookings.length) { myBookingsDiv.innerHTML = '<p class="smalltext">No bookings yet.</p>'; return; }
    
    // Fetch all rides to match booking IDs to ride details
    const allRides = await app.getData(RIDES_ENDPOINT, { status: 'all' });
    
    let html = '<table class="table"><tr><th>Ride</th><th>When</th><th>Seats</th><th>Status</th><th>Action</th></tr>';

    for (const b of allBookings) {
      const ride = allRides.find(r=>r.id==b.ride) || {}; // Note: Django model uses 'ride' field
      const driver = ride.driver || { email: 'N/A', phone_number: 'N/A' };

      const actionButton = (() => {
          if (b.status === 'confirmed') {
              return `<div class="d-flex gap-2"><button class="btn btn-outline-primary" onclick="cancelBooking('${b.id}')">Cancel</button> <button class="btn btn-info" onclick="showDriverDetails('${ride.id}')">View Details</button></div>`;
          } else if (b.status === 'awaiting_rating') {
              return `<div class="d-flex gap-2"><button class="btn btn-warning" onclick="toggleRatingForm('${b.id}')">Rate Driver</button> <button class="btn btn-info" onclick="showDriverDetails('${ride.id}')">View Details</button></div>`;
          } else if (b.status === 'rated') {
              const reviewText = b.description ? ` (${b.description.substring(0, 30)}...)` : '';
              return `<div class="d-flex gap-2"><span class="smalltext">Rated (${b.rating} stars)${reviewText}</span> <button class="btn btn-info" onclick="showDriverDetails('${ride.id}')">View Details</button></div>`;
          } else {
              return `<div class="d-flex gap-2"><span class="smalltext">No action</span> <button class="btn btn-info" onclick="showDriverDetails('${ride.id}')">View Details</button></div>`;
          }
      })();

      html += `<tr id="booking-row-${b.id}"><td>${ride.origin_name} → ${ride.dest_name}</td><td>${new Date(ride.depart_time).toLocaleString()}</td><td>${b.seats_booked}</td><td>${b.status}</td><td>${actionButton}</td></tr>`;
      html += `<tr id="rating-form-row-${b.id}" style="display:none;"><td colspan="5" class="p-0"></td></tr>`;
    }
    html += '</table>';
    myBookingsDiv.innerHTML = html;
  }
  
  // Toggle Rating Form visibility and injection
  window.toggleRatingForm = function(bookingId){
      const ratingRow = document.getElementById(`rating-form-row-${bookingId}`);
      const ratingCell = ratingRow ? ratingRow.querySelector('td') : null;

      if (!ratingRow || !ratingCell) return;

      if (ratingRow.style.display === 'none') {
          // Show form
          const formHtml = `
              <div class="card p-3 my-2 mx-2">
                  <form onsubmit="processRating(event, '${bookingId}')">
                      <h6 class="mb-3">Submit Driver Rating:</h6>
                      <div class="mb-3">
                          <label class="form-label">Legroom (1-5)</label>
                          <select class="form-select" id="legroom-input-${bookingId}" required>
                              <option value="" disabled selected>Select</option>
                              <option value="5">5 - Excellent</option>
                              <option value="4">4 - Good</option>
                              <option value="3">3 - Average</option>
                              <option value="2">2 - Poor</option>
                              <option value="1">1 - Very Poor</option>
                          </select>
                      </div>
                      <div class="mb-3">
                          <label class="form-label">Cleanliness (1-5)</label>
                          <select class="form-select" id="cleanliness-input-${bookingId}" required>
                              <option value="" disabled selected>Select</option>
                              <option value="5">5 - Excellent</option>
                              <option value="4">4 - Good</option>
                              <option value="3">3 - Average</option>
                              <option value="2">2 - Poor</option>
                              <option value="1">1 - Very Poor</option>
                          </select>
                      </div>
                      <div class="mb-3">
                          <label class="form-label">Driving Smoothness (1-5)</label>
                          <select class="form-select" id="driving-input-${bookingId}" required>
                              <option value="" disabled selected>Select</option>
                              <option value="5">5 - Excellent</option>
                              <option value="4">4 - Good</option>
                              <option value="3">3 - Average</option>
                              <option value="2">2 - Poor</option>
                              <option value="1">1 - Very Poor</option>
                          </select>
                      </div>
                      <div class="mb-3">
                          <label class="form-label">Temperature Comfort (1-5)</label>
                          <select class="form-select" id="temperature-input-${bookingId}" required>
                              <option value="" disabled selected>Select</option>
                              <option value="5">5 - Excellent</option>
                              <option value="4">4 - Good</option>
                              <option value="3">3 - Average</option>
                              <option value="2">2 - Poor</option>
                              <option value="1">1 - Very Poor</option>
                          </select>
                      </div>
                      <div class="mb-3">
                          <label class="form-label">Description (Optional, max 100 words)</label>
                          <textarea class="form-control" id="description-input-${bookingId}" rows="3"></textarea>
                      </div>
                      <div class="d-flex gap-2">
                          <button class="btn btn-sm btn-primary" type="submit">Submit Rating</button>
                          <button class="btn btn-sm btn-outline-secondary" type="button" onclick="toggleRatingForm('${bookingId}')">Cancel</button>
                      </div>
                  </form>
              </div>
          `;
          ratingCell.innerHTML = formHtml;
          ratingRow.style.display = 'table-row';
      } else {
          // Hide form
          ratingRow.style.display = 'none';
          ratingCell.innerHTML = '';
      }
  }

  // Submission handler for the rating form
  window.processRating = async function(event, bookingId){
      event.preventDefault();

      const legroomInput = document.getElementById(`legroom-input-${bookingId}`);
      const cleanlinessInput = document.getElementById(`cleanliness-input-${bookingId}`);
      const drivingInput = document.getElementById(`driving-input-${bookingId}`);
      const temperatureInput = document.getElementById(`temperature-input-${bookingId}`);
      const descriptionInput = document.getElementById(`description-input-${bookingId}`);

      const legroom_rating = parseInt(legroomInput.value, 10);
      const cleanliness_rating = parseInt(cleanlinessInput.value, 10);
      const driving_smoothness_rating = parseInt(drivingInput.value, 10);
      const temperature_comfort_rating = parseInt(temperatureInput.value, 10);
      let description = descriptionInput.value.trim();

      // Validation
      const ratings = [legroom_rating, cleanliness_rating, driving_smoothness_rating, temperature_comfort_rating];
      for (let r of ratings) {
          if (isNaN(r) || r < 1 || r > 5) {
              return app.showNotification('Invalid rating. Please select a number between 1 and 5 for all fields.', 'warning');
          }
      }

      // Word Count Validation (Max 100 words)
      const wordCount = description.split(/\s+/).filter(word => word.length > 0).length;
      if (wordCount > 100) {
          return app.showNotification(`Description is too long. Please limit it to 100 words (Current count: ${wordCount}).`, 'warning');
      }

      try {
          // Update the booking status, ratings, and description
          await app.updateData(BOOKINGS_ENDPOINT, bookingId, {
              legroom_rating: legroom_rating,
              cleanliness_rating: cleanliness_rating,
              driving_smoothness_rating: driving_smoothness_rating,
              temperature_comfort_rating: temperature_comfort_rating,
              description: description,
              status: 'rated'
          });

          // Hide the form and refresh the UI
          toggleRatingForm(bookingId);
          await renderMyBookings();
          const avg = (legroom_rating + cleanliness_rating + driving_smoothness_rating + temperature_comfort_rating) / 4;
          app.showNotification(`Thank you! You rated the driver ${avg.toFixed(1)} stars on average.`, 'success');

      } catch (error) {
          app.showNotification('Failed to submit rating.', 'danger');
      }
  }

  window.cancelBooking = async function(bookingId){
    if(!confirm('Cancel booking?')) return;

    try {
        // Update booking status to cancelled (Django View handles seat return internally)
        const updateData = { status: 'cancelled' };
        await app.apiFetch(`${BOOKINGS_ENDPOINT}/${bookingId}/cancel/`, 'PATCH', updateData);

        await renderMyBookings();
        app.showNotification('Booking successfully cancelled. Seat returned to ride.', 'success');

    } catch (error) {
        app.showNotification('Failed to cancel booking.', 'danger');
    }
  }

  // Function to show driver details modal
  window.showDriverDetails = async function(rideId){
      // Fetch ride details to get driver ID and vehicle info
      const ride = await app.getData(`${RIDES_ENDPOINT}/${rideId}`);
      if(!ride) return app.showNotification('Ride not found', 'danger');

      // Fetch full driver details
      const driver = await app.getData(`${USERS_ENDPOINT}/${ride.driver.id}`);
      if(!driver) return app.showNotification('Driver details not found', 'danger');

      // Use vehicle info from the ride
      const vinfo = ride.vehicle_company ? `${ride.vehicle_company} ${ride.vehicle_model} (${ride.vehicle_safety_rating})` : 'N/A';

      const detailsHtml = `
          <div class="mb-3"><strong>Name:</strong> ${driver.first_name}</div>
          <div class="mb-3"><strong>Email:</strong> ${driver.email}</div>
          <div class="mb-3"><strong>Phone:</strong> ${driver.phone_number || 'N/A'}</div>
          <div class="mb-3"><strong>Vehicle:</strong> ${vinfo}</div>
      `;

      document.getElementById('driverDetailsContent').innerHTML = detailsHtml;

      // Show the modal
      const modal = new bootstrap.Modal(document.getElementById('driverDetailsModal'));
      modal.show();
  }

  // Admin Toggle Bookings Details Function
  window.toggleBookingsDetails = async function(rideId){
      const detailRow = document.getElementById(`admin-bookings-details-${rideId}`);
      const detailCell = detailRow ? detailRow.querySelector('td') : null;

      if (!detailRow || !detailCell) return;

      if (detailRow.style.display === 'none') {
          // Fetch all bookings for this ride
          const bookings = await app.getData(BOOKINGS_ENDPOINT, { ride_id: rideId });
          
          if(!bookings.length) {
              detailCell.innerHTML = '<p class="smalltext p-3">No bookings found for this ride.</p>';
          } else {
              let html = '<div class="p-3"><h6 class="mb-2">All Bookings:</h6><table class="table table-sm">';
              html += '<tr><th>Passenger Name</th><th>Seats</th><th>Status</th><th>Rating/Review</th></tr>';
              
              const users = await app.getData(USERS_ENDPOINT); // Fetch all users for name lookup

              bookings.forEach(b => {
                  const user = users.find(u => u.id === b.passenger.id) || {name: 'Unknown', email: 'N/A'};

                  let review = b.status;
                  if (b.status === 'rated') {
                      const ratings = [b.legroom_rating, b.cleanliness_rating, b.driving_smoothness_rating, b.temperature_comfort_rating].filter(r => r);
                      const avg = ratings.length > 0 ? (ratings.reduce((a, c) => a + c, 0) / ratings.length).toFixed(1) : 'N/A';
                      review = `${avg} stars` + (b.description ? `: "${b.description}"` : '');
                  } else if (b.status === 'awaiting_rating') {
                      review = 'Awaiting Rating';
                  }

                  html += `<tr><td>${user.first_name}</td><td>${b.seats_booked}</td><td>${b.status}</td><td>${review}</td></tr>`;
              });
              html += '</table></div>';
              detailCell.innerHTML = html;
          }
          detailRow.style.display = 'table-row';
      } else {
          detailRow.style.display = 'none';
          detailCell.innerHTML = '';
      }
  }

  // Admin summary rendering
  if(document.getElementById('summary')){
    (async () => {
        const users = await app.getData(USERS_ENDPOINT);
        const rides = await app.getData(RIDES_ENDPOINT, { status: 'all' });
        const bookings = await app.getData(BOOKINGS_ENDPOINT);
        
        const summary = document.getElementById('summary');
        const cancelledBookings = bookings.filter(b=>b.status==='cancelled').length;

        summary.innerHTML = `<div class="card"><strong>Users</strong><div class="smalltext">${users.length}</div></div><div class="card"><strong>Rides</strong><div class="smalltext">${rides.length}</div></div><div class="card"><strong>Bookings</strong><div class="smalltext">${bookings.length}</div></div><div class="card"><strong>Cancellations</strong><div class="smalltext">${cancelledBookings}</div></div>`;

        // users table
        const usersTable = document.getElementById('usersTable');
        let uhtml = '<table class="table"><tr><th>Name</th><th>Email</th><th>Role</th><th>Actions</th></tr>';
        users.forEach(u=> {
          const safeDelete = (u.role==='admin') ? '' : `<button class="btn btn-outline-primary" onclick="deleteUser('${u.id}')">Delete</button>`;
          uhtml += `<tr><td>${u.first_name}</td><td>${u.email}</td><td>${u.role}</td><td>${safeDelete}</td></tr>`;
        });
        uhtml += '</table>'; usersTable.innerHTML = uhtml;

        // rides table
        const ridesTable = document.getElementById('ridesTable');
        let rhtml = '<table class="table"><tr><th>Driver</th><th>From → To</th><th>Depart</th><th>Vehicle</th><th>Seats</th><th>Status</th><th>Rating</th><th style="min-width: 250px;">Actions</th></tr>'; 
        
        for (const r of rides) {
            const driver = users.find(u=>u.id==r.driver.id) || {};
            const vinfo = r.vehicle_company ? `${r.vehicle_company} ${r.vehicle_model} (${r.vehicle_safety_rating})` : 'N/A';
            const rideRating = await getAverageRating(r.id);

            const actionButtons = `<div class="d-flex gap-2"><button class="btn btn-outline-primary" onclick="deleteRide('${r.id}')">Delete</button> <button class="btn btn-primary" onclick="toggleBookingsDetails('${r.id}')">View Bookings</button></div>`;

            rhtml += `<tr id="admin-ride-row-${r.id}"><td>${driver.first_name||'N/A'}</td><td>${r.origin_name} → ${r.dest_name}</td><td>${new Date(r.depart_time).toLocaleString()}</td><td>${vinfo}</td><td>${r.seats_available}/${r.total_seats}</td><td>${r.status}</td><td>${rideRating}</td><td>${actionButtons}</td></tr>`;

            rhtml += `<tr id="admin-bookings-details-${r.id}" style="display:none;"><td colspan="9" class="p-0"></td></tr>`;
        }
        rhtml += '</table>'; ridesTable.innerHTML = rhtml;
    })();
  }
  
  // admin helper functions (delete user, delete ride)
  window.deleteUser = async function(userId){
    showConfirmationModal('Delete this user? This will remove their rides and bookings.', async () => {
      try {
        await app.deleteData(USERS_ENDPOINT, userId);
        app.showNotification('User profile deleted.', 'success');
        // Refresh the admin summary and tables
        location.reload();
      } catch(e) {
        console.error('Delete user error:', e);
        app.showNotification('Failed to delete user profile.', 'danger');
      }
    });
  }

  window.deleteRide = async function(rideId){
    showConfirmationModal('Delete this ride?', async () => {
      try {
        // Django view should handle cascaded deletion of bookings
        await app.deleteData(RIDES_ENDPOINT, rideId);
        app.showNotification('Ride deleted.', 'success');
        // Refresh the admin summary and tables
        location.reload();
      } catch(e) {
        console.error('Delete ride error:', e);
        app.showNotification('Failed to delete ride.', 'danger');
      }
    });
  }

  // Helper function to show custom confirmation modal
  function showConfirmationModal(message, onConfirm) {
    const modal = new bootstrap.Modal(document.getElementById('confirmationModal'));
    document.getElementById('confirmationModalBody').textContent = message;
    const confirmBtn = document.getElementById('confirmActionBtn');
    confirmBtn.onclick = () => {
      modal.hide();
      onConfirm();
    };
    modal.show();
  }

  // initial renders
  if (cur) {
      if (cur.role === 'driver') {
          renderMyRides();
      } else if (cur.role === 'user') {
          renderMyBookings();
      }
  }
});