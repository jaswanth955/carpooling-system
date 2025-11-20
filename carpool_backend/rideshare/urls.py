from django.urls import path
from . import views

urlpatterns = [
    path('signup/', views.signup_view, name='signup'),
    path('login/', views.login_view, name='login'),
    path('users/signup/', views.signup_view, name='user-signup'),
    path('users/login/', views.login_view, name='user-login'),
    path('logout/', views.logout_view, name='logout'),
    path('rides/', views.rides_view, name='rides'),
    path('rides/create/', views.create_ride_view, name='create_ride'),
    path('rides/<int:ride_id>/delete/', views.delete_ride_view, name='delete_ride'),
    path('bookings/', views.book_ride_view, name='book_ride'),
    path('bookings/<int:booking_id>/', views.booking_detail_view, name='booking_detail'),
    path('user/rides/', views.user_rides_view, name='user_rides'),
    path('user/bookings/', views.user_bookings_view, name='user_bookings'),
    path('users/', views.users_view, name='users'),
    path('users/<int:user_id>/', views.user_detail_view, name='user_detail'),
    path('users/<int:user_id>/delete/', views.delete_user_view, name='delete_user'),
    path('rides/<int:ride_id>/', views.ride_detail_view, name='ride_detail'),
    path('bookings/<int:booking_id>/cancel/', views.cancel_booking_view, name='cancel_booking'),
    path('bookings/<int:booking_id>/reset/', views.reset_booking_view, name='reset_booking'),
    path('summary/', views.summary_counts_view, name='summary_counts'),
]
