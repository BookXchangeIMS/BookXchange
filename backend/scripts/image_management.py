import zipfile

from fastapi import HTTPException
from PIL import Image, ImageFile
from uuid import uuid4
from fastapi import UploadFile

from backend.config.db import metadata

profile_pictures_path = "backend/images/profile_pictures/"
allowed_pfp_resolutions = {
    "min_width": 100,
    "min_height": 100,
    "max_width": 2000,
    "max_height": 2000,
}
allowed_listing_resolutions = {
    "min_width": 100,
    "min_height": 100,
    "max_width": 3000,
    "max_height": 3000,
}

allowed_image_resolutions = [
    'jpg', 'jpeg', 'png', 'tiff', 'raw'
]
allowed_profile_picture_ratio = 1.6

def validate_profile_picture_resolution(image: ImageFile):
    """
    Validates the resolution of a given profile picture against defined minimum
    and maximum width and height constraints.

    This function extracts the dimensions of the input image and checks if they
    fall within the allowed range of resolutions as specified in the global
    configuration.

    :param image: The input image file to be validated.
    :type image: ImageFile
    :return: A boolean indicating whether the image resolution is valid.
    :rtype: bool
    """
    height, width = image.size
    print(height, width)
    return all([allowed_pfp_resolutions["min_width"] <= width, width <= allowed_pfp_resolutions["max_width"],
                allowed_pfp_resolutions["min_height"] <= height, height <= allowed_pfp_resolutions["max_height"]])

def validate_listing_picture_resolution(image: ImageFile):
    """
    Validates the resolution of a given image against the allowed listing resolution
    boundaries. This function checks if the image dimensions (width and height) are
    within the permissible range defined by `allowed_listing_resolutions`.

    :param image: An instance of ImageFile whose resolution is to be validated.
    :type image: ImageFile
    :return: A boolean indicating whether the image resolution is valid or not.
    :rtype: bool
    """
    height, width = image.size
    print(height, width)
    return all([allowed_listing_resolutions["min_width"] <= width, width <= allowed_listing_resolutions["max_width"],
                allowed_listing_resolutions["min_height"] <= height, height <= allowed_listing_resolutions["max_height"]])

def validate_profile_picture_ratio(image: ImageFile):
    """
    Validates whether the aspect ratio of a given profile picture image falls within
    the allowed profile picture ratio constraints. It ensures the image's width
    to height and height to width ratios are within the permissible range.

    :param image: The profile picture to validate. It should have a `size`
                  attribute that provides the dimensions of the image (width, height).
    :type image: ImageFile
    :return: A boolean indicating whether the image meets the allowed ratio
             constraints.
    :rtype: bool
    """
    height, width = image.size
    return all([width / height < allowed_profile_picture_ratio,
                height / width < allowed_profile_picture_ratio])

def validate_image_extension(image_file: UploadFile):
    """
    Validate the extension of an uploaded image file against a predefined set of allowed
    image resolutions. The function extracts the file extension from the provided
    image file's name and checks if it is present in the set of allowed extensions.

    :param image_file: The uploaded file object that contains the image to be validated.
                       It must have a `filename` attribute from which the extension
                       can be extracted.
    :type image_file: UploadFile

    :return: A boolean indicating whether the image file extension is valid or not.
    :rtype: bool
    """
    image_extension = image_file.filename.split(".")[-1]
    return image_extension in allowed_image_resolutions

def insert_profile_picture(image_file: UploadFile):
    """
    Validates and processes the uploaded image file, ensuring it meets specific profile picture
    requirements such as extension, resolution, and ratio, before saving it to a specific
    location in the backend directory.

    :param image_file: The uploaded file containing the profile picture to be processed.
    :type image_file: UploadFile
    :return: The file path of the saved profile picture.
    :rtype: str
    """
    if not validate_image_extension(image_file):
        raise HTTPException(status_code=400, detail="Invalid image type")
    image = Image.open(image_file.file)
    if not validate_profile_picture_resolution(image):
        raise HTTPException(status_code=400, detail="Image resolution is too small or too big")
    if not validate_profile_picture_ratio(image):
        raise HTTPException(status_code=400, detail="Image ratio is too small or too big")
    image_name = uuid4()
    path = profile_pictures_path + str(image_name) + ".jpg"
    with open(f'backend/images/profile_pictures/{image_name}.jpg', 'w') as output:
        image.save(output, 'JPEG')
    return path

def insert_listing_picture(image_file: UploadFile):
    """
    Inserts a listing picture after validating the image file format and resolution.

    This function checks if the uploaded image file has a valid extension and
    acceptable dimensions. If the validations pass, the image is saved into a
    specified directory, and the path to the saved image is returned.

    :param image_file: Uploaded image file to be processed
    :type image_file: UploadFile
    :return: Path to the saved image file
    :rtype: str
    :raises HTTPException: If the image type is invalid or if its resolution does
        not meet the required constraints
    """
    if not validate_image_extension(image_file):
        raise HTTPException(status_code=400, detail="Invalid image type")
    image = Image.open(image_file.file)
    if not validate_listing_picture_resolution(image):
        raise HTTPException(status_code=400, detail="Image resolution is too small or too big")
    image_name = uuid4()
    path = profile_pictures_path + str(image_name) + ".jpg"
    with open(f'backend/images/listing_pictures/{image_name}.jpg', 'w') as output:
        image.save(output, 'JPEG')
    return path

def insert_profile_image_path(userid: int, image_path: str, db):
    """
    Updates the image path for a specific user in the Users table of the database.

    This function takes the user ID, the new image path, and the database connection
    to perform the update operation. If the user ID is found, the corresponding image
    path is updated in the Users table. Handles cases where the operation could fail
    by raising an HTTP exception.

    :param userid: The unique identifier of the user whose image path is to be updated.
    :type userid: int
    :param image_path: The new image path to be associated with the user.
    :type image_path: str
    :param db: The database connection object used to perform the operation.
    :return: None
    :raises HTTPException: If the update operation fails due to any database conflict or
                           other unforeseen reasons.
    """
    users = metadata.tables["Users"]
    stmt = users.update().values(ProfileImagePath=image_path).where(users.c.UserID == userid)
    try:
        db.execute(stmt)
        db.commit()
    except Exception as e:
        raise HTTPException(status_code=409, detail="Couldn't add image path")

def insert_listing_image_path(listingid: int, image_path: str, db):
    """
    Inserts an image path associated with a listing ID into the ListingPhoto table in the database. The function will attempt
    to execute and commit the insertion. If an error occurs during the process, it raises an HTTPException with the appropriate
    error message.

    :param listingid: Represents the unique identifier of the listing to which the image path is associated.
    :type listingid: int
    :param image_path: The file path of the image to be stored in the database.
    :type image_path: str
    :param db: A database connection object used to execute the insertion query.
    :type db: Any

    :return: None
    :rtype: None

    :raises HTTPException: Raised with status code 409 if the image path insertion fails due to any database operation error.
    """
    listingphoto = metadata.tables["ListingPhoto"]
    stmt = listingphoto.insert().values(ImagePath=image_path, ListingID= listingid)
    try:
        db.execute(stmt)
        db.commit()
    except Exception as e:
        raise HTTPException(status_code=409, detail="Couldn't add image path")

def delete_listing_image_paths(listingid: int, db):
    """
    Deletes all image paths associated with a specific listing ID from the database.

    This function removes entries from the ListingPhoto table that match the
    provided listing ID. It ensures that all images linked to the listing
    are no longer present in the database. If the operation fails, an exception
    is raised to indicate the failure.

    :param listingid: The unique identifier of the listing for which image paths are
                      to be deleted.
    :type listingid: int
    :param db: The database connection/session object used to execute the
               delete operation.
    :return: None
    :raises HTTPException: If there is a conflict or error during the delete operation.
    """
    listingphoto = metadata.tables["ListingPhoto"]
    stmt = listingphoto.delete().where(listingphoto.c.ListingID == listingid)
    try:
        db.execute(stmt)
        db.commit()
    except Exception as e:
        raise HTTPException(status_code=409, detail="Couldn't delete image paths")

def get_listing_image_paths(listingid, db):
    """
    Fetches all image paths for a given listing ID from the database.

    This function queries the database to retrieve all the image paths associated
    with a specific listing. The `listingid` is used to filter the results, and the
    function assumes the existence of a "ListingPhoto" table within the database
    metadata. If any exception occurs during the database query execution, an
    HTTPException with a 404 status code is raised.

    :param listingid: The unique identifier of the listing to retrieve image paths for.
    :type listingid: int
    :param db: A database connection or session object supporting the `execute` method.
    :type db: sqlalchemy.engine.base.Connection or sqlalchemy.orm.Session
    :return: A list of rows containing image path results fetched from the database.
    :rtype: list
    :raises HTTPException: If the specified listing's image paths are not found or an error occurs in the query.
    """
    listingphoto = metadata.tables["ListingPhoto"]
    stmt = listingphoto.select().where(listingphoto.c.ListingID ==listingid)
    try:
        result = db.execute(stmt)
        return result.fetchall()
    except Exception as e:
        raise HTTPException(status_code=404, detail="Couldn't find image paths")

def make_a_zipfile_of_pictures(picturepaths: list[str]):
    zipfile_path = f"backend/images/listing_pictures/{uuid4()}.zip"
    with zipfile.ZipFile(zipfile_path, "w") as zipf:
        for picturepath in picturepaths:
            zipf.write(picturepath)
    return zipfile_path




