from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    
    ROLE_CHOICES = [
        ('user', 'User'),
        ('driver', 'Driver'),
        ('admin', 'Admin'),
    ]
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='user')
    phone_number = models.CharField(max_length=15, blank=True, null=True)

    vehicle_company = models.CharField(max_length=100, blank=True, null=True)
    vehicle_model = models.CharField(max_length=100, blank=True, null=True)
    vehicle_safety_rating = models.DecimalField(
        max_digits=2, 
        decimal_places=1, 
        default=0.0,
        validators=[MinValueValidator(0.0), MaxValueValidator(5.0)]
    )

    def __str__(self):
        return f"{self.user.username} ({self.role})"

class Ride(models.Model):
    driver = models.ForeignKey(User, on_delete=models.CASCADE, related_name='posted_rides')

    origin_name = models.CharField(max_length=255)
    dest_name = models.CharField(max_length=255)
    depart_time = models.DateTimeField()
    total_seats = models.IntegerField(validators=[MinValueValidator(1)])
    seats_available = models.IntegerField()
    price_per_seat = models.DecimalField(max_digits=6, decimal_places=2, default=0.0)

    vehicle_company = models.CharField(max_length=100, blank=True, null=True)
    vehicle_model = models.CharField(max_length=100, blank=True, null=True)
    vehicle_safety_rating = models.DecimalField(
        max_digits=2,
        decimal_places=1,
        default=0.0,
        validators=[MinValueValidator(0.0), MaxValueValidator(5.0)]
    )
    STATUS_CHOICES = [
        ('open', 'Open'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='open')
    preferences = models.TextField(blank=True, help_text="JSON serialized preferences")
    created_at = models.DateTimeField(auto_now_add=True)
    def __str__(self):
        return f"{self.origin_name} to {self.dest_name} by {self.driver.username}"

class Booking(models.Model):
    ride = models.ForeignKey(Ride, on_delete=models.CASCADE, related_name='bookings')
    passenger = models.ForeignKey(User, on_delete=models.CASCADE, related_name='booked_rides')
    seats_booked = models.IntegerField(validators=[MinValueValidator(1)])
    payment_mode = models.CharField(max_length=50, default='offline')    
    STATUS_CHOICES = [
        ('confirmed', 'Confirmed'),
        ('cancelled', 'Cancelled'),
        ('awaiting_rating', 'Awaiting Rating'),
        ('rated', 'Rated'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='confirmed')
    legroom_rating = models.IntegerField(
        null=True, blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Legroom rating (1-5)"
    )
    cleanliness_rating = models.IntegerField(
        null=True, blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Cleanliness rating (1-5)"
    )
    driving_smoothness_rating = models.IntegerField(
        null=True, blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Driving smoothness rating (1-5)"
    )
    temperature_comfort_rating = models.IntegerField(
        null=True, blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Temperature comfort rating (1-5)"
    )
    description = models.TextField(
        max_length=1000,
        blank=True,
        help_text="Optional description/review"
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Booking {self.id} on Ride {self.ride_id} by {self.passenger.username}"