from django.shortcuts import render
from django.http import JsonResponse
from django.contrib.auth.models import User
from django.contrib.auth import authenticate, login, logout
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json
import uuid
from .models import UserProfile, Ride, Booking
from .serializers import UserProfileSerializer, RideSerializer, BookingSerializer

# Create your views here.

@csrf_exempt
@require_http_methods(["POST"])
def signup_view(request):
    try:
        data = json.loads(request.body)
        password = data.get('password')
        email = data.get('email')
        phone_number = data.get('phone_number')

        role = data.get('role', 'user')

        if User.objects.filter(email=email).exists():
            return JsonResponse({'error': 'Email already exists'}, status=400)

        # Generate unique username using UUID
        username = str(uuid.uuid4())
        user = User.objects.create_user(username=username, password=password, email=email)
        user.first_name = data.get('name')
        user.save()
        profile = UserProfile.objects.create(user=user, role=role, phone_number=phone_number)
        return JsonResponse({'message': 'User created successfully', 'id': user.id, 'first_name': user.first_name, 'email': user.email, 'role': profile.role}, status=201)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@csrf_exempt
@require_http_methods(["POST"])
def login_view(request):
    try:
        data = json.loads(request.body)
        email = data.get('email')
        password = data.get('password')

        user = User.objects.filter(email__iexact=email).first()
        if user and user.check_password(password):
            login(request, user)
            profile = UserProfile.objects.get(user=user)
            return JsonResponse({
                'message': 'Login successful',
                'id': user.id,
                'first_name': user.first_name,
                'email': user.email,
                'role': profile.role
            }, status=200)
        else:
            return JsonResponse({'error': 'Invalid credentials'}, status=401)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@csrf_exempt
@require_http_methods(["POST"])
def logout_view(request):
    logout(request)
    return JsonResponse({'message': 'Logged out successfully'})

@csrf_exempt
@require_http_methods(["GET"])
def rides_view(request):
    try:
        rides = Ride.objects.all()

        # Filter by driver_id if provided
        driver_id = request.GET.get('driver_id')
        if driver_id:
            rides = rides.filter(driver_id=int(driver_id))

        # Filter by status if provided and not 'all'
        status = request.GET.get('status')
        if status and status != 'all':
            rides = rides.filter(status=status)

        # Filter by origin if provided (case-insensitive partial match)
        origin = request.GET.get('origin')
        if origin:
            rides = rides.filter(origin_name__icontains=origin)

        # Filter by dest if provided (case-insensitive partial match)
        dest = request.GET.get('dest')
        if dest:
            rides = rides.filter(dest_name__icontains=dest)

        serializer = RideSerializer(rides, many=True)
        return JsonResponse(serializer.data, safe=False)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@csrf_exempt
@require_http_methods(["POST"])
def create_ride_view(request):
    try:
        data = json.loads(request.body)
        driver_id = data.get('driver_id')
        origin_name = data.get('origin_name')
        dest_name = data.get('dest_name')
        depart_time = data.get('depart_time')
        total_seats = data.get('total_seats')
        seats_available = data.get('seats_available')
        price_per_seat = data.get('price_per_seat')
        vehicle_company = data.get('vehicle_company')
        vehicle_model = data.get('vehicle_model')
        vehicle_safety_rating = data.get('vehicle_safety_rating')
        preferences = data.get('preferences', '')

        driver = User.objects.get(id=driver_id)
        ride = Ride.objects.create(
            driver=driver,
            origin_name=origin_name,
            dest_name=dest_name,
            depart_time=depart_time,
            total_seats=total_seats,
            seats_available=seats_available,
            price_per_seat=price_per_seat,
            vehicle_company=vehicle_company,
            vehicle_model=vehicle_model,
            vehicle_safety_rating=vehicle_safety_rating,
            preferences=preferences
        )
        return JsonResponse({'message': 'Ride created successfully', 'ride_id': ride.id}, status=201)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@csrf_exempt
@require_http_methods(["GET", "POST"])
def book_ride_view(request):
    if request.method == 'GET':
        try:
            ride_id = request.GET.get('ride_id')
            status = request.GET.get('status')
            passenger_id = request.GET.get('passenger_id')
            bookings = Booking.objects.all()
            if ride_id:
                bookings = bookings.filter(ride_id=ride_id)
            if status:
                bookings = bookings.filter(status=status)
            if passenger_id:
                bookings = bookings.filter(passenger_id=passenger_id)
            serializer = BookingSerializer(bookings, many=True)
            return JsonResponse(serializer.data, safe=False)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)
    else:  # POST
        try:
            data = json.loads(request.body)
            ride_id = data.get('ride_id')
            passenger_id = data.get('passenger_id')
            seats_booked = data.get('seats_booked')
            payment_mode = data.get('payment_mode', 'offline')

            ride = Ride.objects.get(id=ride_id)
            passenger = User.objects.get(id=passenger_id)

            if ride.seats_available < seats_booked:
                return JsonResponse({'error': 'Not enough seats available'}, status=400)

            booking = Booking.objects.create(
                ride=ride,
                passenger=passenger,
                seats_booked=seats_booked,
                payment_mode=payment_mode
            )

            ride.seats_available -= seats_booked
            ride.save()

            return JsonResponse({'message': 'Booking successful', 'booking_id': booking.id}, status=201)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

@csrf_exempt
@require_http_methods(["GET"])
def user_rides_view(request):
    try:
        user_id = request.GET.get('user_id')
        if not user_id:
            return JsonResponse({'error': 'user_id required'}, status=400)

        user = User.objects.get(id=user_id)
        rides = Ride.objects.filter(driver=user)
        serializer = RideSerializer(rides, many=True)
        return JsonResponse(serializer.data, safe=False)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@csrf_exempt
@require_http_methods(["GET"])
def user_bookings_view(request):
    try:
        user_id = request.GET.get('user_id')
        if not user_id:
            return JsonResponse({'error': 'user_id required'}, status=400)

        user = User.objects.get(id=user_id)
        bookings = Booking.objects.filter(passenger=user)
        serializer = BookingSerializer(bookings, many=True)
        return JsonResponse(serializer.data, safe=False)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@csrf_exempt
@require_http_methods(["DELETE"])
def delete_ride_view(request, ride_id):
    try:
        ride = Ride.objects.get(id=ride_id)
        ride.delete()
        return JsonResponse({'message': 'Ride deleted successfully'})
    except Ride.DoesNotExist:
        return JsonResponse({'error': 'Ride not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@csrf_exempt
@require_http_methods(["DELETE"])
def delete_user_view(request, user_id):
    try:
        user = User.objects.get(id=user_id)
        user.delete()
        return JsonResponse({'message': 'User deleted successfully'})
    except User.DoesNotExist:
        return JsonResponse({'error': 'User not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@csrf_exempt
@require_http_methods(["POST", "PATCH"])
def cancel_booking_view(request, booking_id):
    try:
        booking = Booking.objects.get(id=booking_id)
        if request.method == 'PATCH':
            data = json.loads(request.body)
            status = data.get('status')
            if status:
                booking.status = status
                booking.save()
                if status == 'cancelled':
                    ride = booking.ride
                    ride.seats_available += booking.seats_booked
                    ride.save()
                return JsonResponse({'message': 'Booking updated successfully'})
        else:
            booking.status = 'cancelled'
            booking.save()
            ride = booking.ride
            ride.seats_available += booking.seats_booked
            ride.save()
            return JsonResponse({'message': 'Booking cancelled successfully'})
    except Booking.DoesNotExist:
        return JsonResponse({'error': 'Booking not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@csrf_exempt
@require_http_methods(["POST"])
def reset_booking_view(request, booking_id):
    try:
        booking = Booking.objects.get(id=booking_id)
        booking.status = 'confirmed'
        booking.save()
        return JsonResponse({'message': 'Booking reset successfully'})
    except Booking.DoesNotExist:
        return JsonResponse({'error': 'Booking not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@csrf_exempt
@require_http_methods(["GET"])
def users_view(request):
    try:
        users = User.objects.filter(profile__isnull=False)
        data = []
        for user in users:
            profile = user.profile
            data.append({
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'role': profile.role,
                'phone_number': profile.phone_number
            })
        return JsonResponse(data, safe=False)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@csrf_exempt
@require_http_methods(["GET"])
def summary_counts_view(request):
    try:
        total_users = User.objects.count()
        total_rides = Ride.objects.count()
        total_bookings = Booking.objects.count()
        return JsonResponse({
            'total_users': total_users,
            'total_rides': total_rides,
            'total_bookings': total_bookings
        })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@csrf_exempt
@require_http_methods(["GET"])
def user_detail_view(request, user_id):
    try:
        user = User.objects.get(id=user_id)
        profile = UserProfile.objects.get(user=user)
        data = {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'role': profile.role,
            'phone_number': profile.phone_number
        }
        return JsonResponse(data)
    except User.DoesNotExist:
        return JsonResponse({'error': 'User not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@csrf_exempt
@require_http_methods(["GET", "PATCH"])
def booking_detail_view(request, booking_id):
    try:
        booking = Booking.objects.get(id=booking_id)
        if request.method == 'GET':
            serializer = BookingSerializer(booking)
            return JsonResponse(serializer.data)
        elif request.method == 'PATCH':
            data = json.loads(request.body)
            # Update booking fields
            for field in ['status', 'legroom_rating', 'cleanliness_rating', 'driving_smoothness_rating', 'temperature_comfort_rating', 'description']:
                if field in data:
                    setattr(booking, field, data[field])
            booking.save()

            serializer = BookingSerializer(booking)
            return JsonResponse(serializer.data)
    except Booking.DoesNotExist:
        return JsonResponse({'error': 'Booking not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@csrf_exempt
@require_http_methods(["GET", "PATCH"])
def ride_detail_view(request, ride_id):
    try:
        ride = Ride.objects.get(id=ride_id)
        if request.method == 'GET':
            serializer = RideSerializer(ride)
            return JsonResponse(serializer.data)
        elif request.method == 'PATCH':
            data = json.loads(request.body)
            # Update ride fields
            for field in ['status']:
                if field in data:
                    setattr(ride, field, data[field])
            ride.save()

            # Handle status changes
            if data.get('status') == 'cancelled':
                # Cancel all confirmed bookings and return seats
                bookings = Booking.objects.filter(ride=ride, status='confirmed')
                for booking in bookings:
                    booking.status = 'cancelled'
                    booking.save()
                    ride.seats_available += booking.seats_booked
                ride.save()
            elif data.get('status') == 'completed':
                # Set bookings to awaiting_rating
                bookings = Booking.objects.filter(ride=ride, status='confirmed')
                for booking in bookings:
                    booking.status = 'awaiting_rating'
                    booking.save()

            serializer = RideSerializer(ride)
            return JsonResponse(serializer.data)
    except Ride.DoesNotExist:
        return JsonResponse({'error': 'Ride not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)
