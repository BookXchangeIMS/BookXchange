# How to Run the *Backend + DB* on your machine locally

---

## Step 1. Confirm configuration of Environment files and file integrity
![img.png](img.png)

*`BookXchange/backend/config/config.py`* Is an environment file for python <br>
*`BookXchange/backend/.env`* Is an environment file for Docker

![img_11.png](img_11.png)
While having *`BookXchange/backend/database/entrypoint.sh`* open on the *Bottom-right* corner there is an *LF* field <br>
Stating line separation symbolics. Make sure that you have `LF` and *not* `CRLF`

## Step 2. Verify that url configuration is correct
![img_1.png](img_1.png)

Inside of `BookXchange/backend/config/db.py` there is a line that on the comment says "Inside of container Testing" <br>
Corresponding line **must** be uncommented while the line that corresponds to "Out of container Testing" must be commented <br>
It has to look like the code shown on the picture

## Step 3. Run the Docker-Desktop application on your pc
![img_2.png](img_2.png)
At the Bottom-left corner you must see **Engine Running** in green; otherwise you are not going to be able to run the docker

## Step 4. Open the Terminal and locate the directory
![img_3.png](img_3.png)
Open the terminal and using following commands you should get inside of *backend/* folder:
> `cd ..` - Move back the directory <br>
> `cd [name of the folder]` - Move into the directory by its name

Eventually your display path must look like following:
> `..[folder where you cloned repository into]\BookXchange\backend>`

## Step 5. Write command into the terminal and press *Enter*
![img_5.png](img_5.png)
> `docker-compose up -d` - Is your command if you are on *Windows* <br>
> `docker compose up -d` - Is your command if you are on *MacOS or Linux*
> 
## Step 6. Wait
## It is going to take a while (10mins), because it needs to download images and compile layers

### Downloading of Images
![img_4.png](img_4.png)

### Also downloading of images...
![img_6.png](img_6.png)

### Compiling layers
![img_7.png](img_7.png)

### Running containers one-by-one (SQL server has to be first one, and backend has to wait till it is fully ready)
![img_8.png](img_8.png)

## Step 7. Verify that Containers are up
![img_9.png](img_9.png)
Eventually you will see same image on your computer

![img_10.png](img_10.png)
>You can also check containers through the docker app in the **Containers Tab** *(must be lit as green)*

## Step 8. Access the backend through a browser
![img_12.png](img_12.png)
By writing `http://localhost:8000/docs#/` you should be able to access the swagger schema of the api

## Step 9. Endpoints
![img_13.png](img_13.png)
These are endpoints that are grouped by their goal
![img_14.png](img_14.png)
You can expand each of those and **test** by clicking the *Try it Out* button
![img_15.png](img_15.png)
After clicking the button you will be able to insert data into input fields and click *Execute*
![img_16.png](img_16.png)
After successful execution you will see the desired response message

## Step 10. Schemas
![img_17.png](img_17.png)
When developing you can go back to schemas to see the data model of both Inputs and Outputs that endpoind demand
![img_18.png](img_18.png)