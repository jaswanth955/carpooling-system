# --- FILE START: rideshare/serializers.py ---
from rest_framework import serializers
from .models import UserProfile, Ride, Booking
from django.contrib.auth.models import User

# Serializer for basic user info, to be embedded in Ride/Booking responses
class SimpleUserSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='first_name')
    email = serializers.CharField()

    # Include vehicle details for frontend display purposes.
    # We access the related UserProfile via 'profile'.
    vehicle_company = serializers.CharField(source='profile.vehicle_company', read_only=True, allow_null=True)
    vehicle_model = serializers.CharField(source='profile.vehicle_model', read_only=True, allow_null=True)
    vehicle_safety_rating = serializers.DecimalField(source='profile.vehicle_safety_rating', max_digits=2, decimal_places=1, read_only=True, allow_null=True)
    phone_number = serializers.CharField(source='profile.phone_number', read_only=True, allow_null=True)

    class Meta:
        model = User
        fields = ['id', 'name', 'email', 'phone_number', 'vehicle_company', 'vehicle_model', 'vehicle_safety_rating']

# Serializer for driver in ride responses, hiding email and phone for privacy
class RideDriverSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='first_name')

    class Meta:
        model = User
        fields = ['id', 'name']

class UserProfileSerializer(serializers.ModelSerializer):
    # Map Django's default User fields (first_name, email) into the profile view
    first_name = serializers.CharField(source='user.first_name')
    email = serializers.CharField(source='user.email')
    # Use 'user' to return the User's Primary Key (PK) which is the ID used for API calls
    user = serializers.IntegerField(source='user.id', read_only=True)
    
    class Meta:
        model = UserProfile
        fields = [
            'user', 'id', 'first_name', 'email', 'role', 'phone_number',
            'vehicle_company', 'vehicle_model', 'vehicle_safety_rating'
        ]
        read_only_fields = ['id']


class RideSerializer(serializers.ModelSerializer):
    # Use RideDriverSerializer to embed driver data without email and phone for privacy
    driver = RideDriverSerializer(read_only=True)

    class Meta:
        model = Ride
        fields = [
            'id', 'driver', 'origin_name', 'dest_name', 'depart_time',
            'total_seats', 'seats_available', 'price_per_seat',
            'vehicle_company', 'vehicle_model', 'vehicle_safety_rating',
            'status', 'preferences', 'created_at'
        ]
        # These fields are set by the server, not the client on creation
        read_only_fields = ['id', 'driver', 'seats_available', 'created_at']

class BookingSerializer(serializers.ModelSerializer):
    # Use SimpleUserSerializer to embed passenger data
    passenger = SimpleUserSerializer(read_only=True)

    class Meta:
        model = Booking
        fields = [
            'id', 'ride', 'passenger', 'seats_booked',
            'payment_mode', 'status', 'legroom_rating', 'cleanliness_rating',
            'driving_smoothness_rating', 'temperature_comfort_rating', 'description',
            'created_at'
        ]
        read_only_fields = ['id', 'passenger', 'created_at']
        
# --- FILE END: rideshare/serializers.py ---