# Archivus-Server

## Overview
Archivus-Server is a sophisticated backend utility designed for comprehensive file management, facilitating efficient storage solutions, seamless file exploration, and versatile file manipulation capabilities. Built on the robust NestJS framework, this server-side application integrates cutting-edge technologies to provide a reliable and scalable environment for managing large volumes of data.

## Features
- **File Management**: Efficiently manage file storage with advanced features such as automatic file categorization, tagging, and archiving.
- **File Exploration**: Utilize powerful search functionalities to quickly navigate through large datasets and retrieve files effortlessly.
- **File Manipulation**: Perform various file operations such as conversions, compression, and encryption with ease.

## Technical Stack
- **NestJS**: Leveraging the latest NestJS modules to ensure a well-structured and maintainable codebase.
- **Mongoose**: Utilizing Mongoose for robust data management and schema validation with MongoDB.
- **Passport**: Integrated Passport for comprehensive strategies to handle authentication and authorization.
- **Jest**: Employing Jest for thorough testing, ensuring reliability and performance.

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-repository/archivus-server.git
   ```

2. Install dependencies:
   ```bash
   cd archivus-server
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```
   Edit the `.env` file with your database credentials and other configurations.

4. Build the project:
   ```bash
   npm run build
   ```

5. Run the server:
   ```bash
   npm run start:prod
   ```

## Development
To run the server in development mode with hot-reloading:
```bash
npm run dev
```

## Testing
Run tests using Jest:
```bash
npm test
```

For continuous testing with watch mode:
```bash
npm run test:watch
```

## Author
Developed by mpakholska, dedicated to providing solutions that enhance the efficiency and usability of data management systems.
