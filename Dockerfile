    # Start from the official PostgreSQL base image
    FROM postgres:17

    # Install necessary dependencies for building extensions
    RUN apt-get update && apt-get install -y \
        build-essential \
        git \
        postgresql-server-dev-17 && \
        rm -rf /var/lib/apt/lists/*

    # Clone, build, and install the pgvector extension
    RUN git clone https://github.com/pgvector/pgvector.git /tmp/pgvector && \
        cd /tmp/pgvector && \
        make && make install && \
        rm -rf /tmp/pgvector

    # Set default environment variables
    ENV POSTGRES_USER=postgres
    ENV POSTGRES_PASSWORD=randompassword
    ENV POSTGRES_DB=mydb

    # Expose the default PostgreSQL port
    EXPOSE 5432

    # Start the PostgreSQL server
    CMD ["postgres"]
