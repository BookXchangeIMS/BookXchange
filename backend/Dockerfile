# Use a Python base image
FROM python:3.11-bookworm


# Required system tools
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    apt-transport-https \
    software-properties-common

# Add Microsoft repo safely (no apt-key)
RUN curl -fsSL https://packages.microsoft.com/keys/microsoft.asc \
    | gpg --dearmor \
    | tee /usr/share/keyrings/microsoft.gpg > /dev/null && \
    echo "deb [signed-by=/usr/share/keyrings/microsoft.gpg] https://packages.microsoft.com/debian/12/prod bookworm main" \
    > /etc/apt/sources.list.d/mssql-release.list

# Install ODBC Driver 18 + unixODBC
RUN apt-get update && ACCEPT_EULA=Y apt-get install -y \
    msodbcsql18 \
    unixodbc \
    unixodbc-dev \
    g++ \
    libssl3 \
    libgssapi-krb5-2 \
    libkrb5-3 \
    libcurl4 \
    libstdc++6 \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

RUN printf "%s\n" \
"[ODBC Driver 18 for SQL Server]" \
"Description=Microsoft ODBC Driver 18 for SQL Server" \
"Driver=/opt/microsoft/msodbcsql18/lib64/libmsodbcsql-18.5.so.1.1" \
"UsageCount=1" \
| tee /etc/odbcinst.ini


# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Create and set the app directory
WORKDIR /app

# Copy the application files preserving backend/ structure
COPY . /app/backend

# Install Python dependencies
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

# Expose the port that the application will run on
EXPOSE 8000

# Set the default command to Uvicorn
CMD ["uvicorn", "backend.main:app", "--port", "8000", "--host", "0.0.0.0"]