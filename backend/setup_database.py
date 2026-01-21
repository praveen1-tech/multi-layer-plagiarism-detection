"""
Database setup script.
Run this once to create the MySQL database and tables.

Usage:
    python setup_database.py

Prerequisites:
    1. MySQL must be installed and running
    2. Update .env file with your MySQL credentials
"""
import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def create_database():
    """Create the database if it doesn't exist."""
    from dotenv import load_dotenv
    import pymysql
    
    load_dotenv()
    
    host = os.getenv("MYSQL_HOST", "localhost")
    port = int(os.getenv("MYSQL_PORT", "3306"))
    user = os.getenv("MYSQL_USER", "root")
    password = os.getenv("MYSQL_PASSWORD", "")
    database = os.getenv("MYSQL_DATABASE", "plagiarism_detector")
    
    print(f"Connecting to MySQL at {host}:{port} as {user}...")
    
    try:
        # Connect without database to create it
        connection = pymysql.connect(
            host=host,
            port=port,
            user=user,
            password=password
        )
        
        with connection.cursor() as cursor:
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS {database}")
            print(f"Database '{database}' created or already exists.")
        
        connection.close()
        return True
        
    except Exception as e:
        print(f"Error creating database: {e}")
        return False


def create_tables():
    """Create all tables using SQLAlchemy."""
    try:
        from app.core.database import init_db
        init_db()
        return True
    except Exception as e:
        print(f"Error creating tables: {e}")
        return False


def main():
    print("=" * 50)
    print("Plagiarism Detector - Database Setup")
    print("=" * 50)
    print()
    
    # Step 1: Create database
    print("[1/2] Creating database...")
    if not create_database():
        print("Failed to create database. Please check your MySQL installation and .env file.")
        sys.exit(1)
    
    # Step 2: Create tables
    print("[2/2] Creating tables...")
    if not create_tables():
        print("Failed to create tables.")
        sys.exit(1)
    
    print()
    print("=" * 50)
    print("Database setup complete!")
    print("You can now start the backend server.")
    print("=" * 50)


if __name__ == "__main__":
    main()
