from geopy.geocoders import Nominatim
from fastapi import HTTPException
from backend.config.db import metadata
from backend.models import Location

# Create a single global geolocator instance
geolocator = Nominatim(user_agent="my_geocoder")

def address_to_coordinates(address: str) -> tuple[float, float] | None:
    """
    Converts a given address into geographical coordinates (latitude and longitude).

    This function takes an address as input and uses a geocoding service
    to fetch the corresponding geographical coordinates. If the address
    can be successfully located, the latitude and longitude are returned
    as a tuple. If the address cannot be resolved or an error occurs, the
    function raises an exception or returns None.

    :param address: The physical address to be geo-located.
    :type address: str
    :return: A tuple containing latitude and longitude of the address, or
        None if the address could not be converted.
    :rtype: tuple[float, float] | None
    :raises HTTPException: If the conversion process encounters an error and
        the address cannot be processed.
    """
    try:
        location = geolocator.geocode(address)
        if location:
            return (location.latitude, location.longitude)
        return None
    except Exception as e:
        raise HTTPException(status_code=404, detail="Couldn't convert the address")


def coordinates_to_address(latitude: float, longitude: float) -> str | None:
    """
    Converts geographic coordinates (latitude and longitude) into a human-readable address.

    The function utilizes a geolocator service to reverse geocode the provided latitude
    and longitude values. If a valid address is found, it will be returned as a string.
    Otherwise, the function may return None. In case of errors during the geocoding process,
    an HTTPException with appropriate status code and error details is raised.

    :param latitude: Geographic latitude of the location to be converted.
    :type latitude: float
    :param longitude: Geographic longitude of the location to be converted.
    :type longitude: float
    :return: A string representation of the address corresponding to the input coordinates,
        or None if the address could not be resolved.
    :rtype: str | None
    :raises HTTPException: If any exception occurs during the reverse geocoding process.
    """
    try:
        location = geolocator.reverse((latitude, longitude))
        if location:
            return location.address
        return None
    except Exception as e:
        raise HTTPException(status_code=404, detail="Couldn't convert the coordinates")

def post_location(data: Location, db):
    locations = metadata.tables["Locations"]
    stmt1 = locations.insert().values(
        Latitude=data.Latitude,
        Longitude=data.Longitude,
        Address=data.Address,
        Description=data.Description)
    try:
        db.execute(stmt1)
        db.commit()
    except Exception as e:
        raise HTTPException(status_code=409, detail="Couldn't add location")
    stmt2 = locations.select().where(locations.c.Longitude == data.Longitude, locations.c.Latitude == data.Latitude)
    locationid = db.execute(stmt2).fetchone().LocationID
    return locationid

def get_location_by_id(locationid, db):
    locations = metadata.tables["Locations"]
    stmt = locations.select().where(locations.c.LocationID == locationid)
    try:
        location = db.execute(stmt).fetchone()
    except Exception as e:
        raise HTTPException(status_code=404, detail="Couldn't find location")
    return location
