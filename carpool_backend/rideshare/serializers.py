from rest_framework import serializers
from .models import UserProfile, Ride, Booking
from django.contrib.auth.models import User

class SimpleUserSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='first_name')
    email = serializers.CharField()
    vehicle_company = serializers.CharField(source='profile.vehicle_company', read_only=True, allow_null=True)
    vehicle_model = serializers.CharField(source='profile.vehicle_model', read_only=True, allow_null=True)
    vehicle_safety_rating = serializers.DecimalField(source='profile.vehicle_safety_rating', max_digits=2, decimal_places=1, read_only=True, allow_null=True)
    phone_number = serializers.CharField(source='profile.phone_number', read_only=True, allow_null=True)

    class Meta:
        model = User
        fields = ['id', 'name', 'email', 'phone_number', 'vehicle_company', 'vehicle_model', 'vehicle_safety_rating']

class RideDriverSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='first_name')

    class Meta:
        model = User
        fields = ['id', 'name']

class UserProfileSerializer(serializers.ModelSerializer):
    first_name = serializers.CharField(source='user.first_name')
    email = serializers.CharField(source='user.email')
    user = serializers.IntegerField(source='user.id', read_only=True)
    
    class Meta:
        model = UserProfile
        fields = [
            'user', 'id', 'first_name', 'email', 'role', 'phone_number',
            'vehicle_company', 'vehicle_model', 'vehicle_safety_rating'
        ]
        read_only_fields = ['id']


class RideSerializer(serializers.ModelSerializer):
    driver = RideDriverSerializer(read_only=True)

    class Meta:
        model = Ride
        fields = [
            'id', 'driver', 'origin_name', 'dest_name', 'depart_time',
            'total_seats', 'seats_available', 'price_per_seat',
            'vehicle_company', 'vehicle_model', 'vehicle_safety_rating',
            'status', 'preferences', 'created_at'
        ]
        read_only_fields = ['id', 'driver', 'seats_available', 'created_at']

class BookingSerializer(serializers.ModelSerializer):
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
        