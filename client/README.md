# Archivus-Client

## Overview
Archivus-Client is a dynamic web application that provides an intuitive interface for managing and interacting with files stored on the Archivus-Server. It leverages modern web technologies to deliver a seamless user experience for file exploration, management, and manipulation.

## Features
- **Interactive UI**: Clean and responsive interface for navigating through file directories and performing file operations like search, upload, and download.
- **Real-Time Updates**: Integrated real-time updates to ensure users see the most current file states without needing to refresh the page.
- **Advanced Search**: Powerful search capabilities that allow users to quickly find files based on name, type, size, and other metadata.
- **File Previews**: Ability to preview files directly in the browser, supporting a wide range of file formats.

## Technical Stack
- **Express**: Utilizes Express to serve static files and manage routing.
- **EJS**: Employs Embedded JavaScript Templates to render HTML on the server side, making the application fast and efficient.
- **TailwindCSS**: Uses TailwindCSS for styling, ensuring a modern and customizable UI that is responsive and accessible.
- **Chart.js**: Implements Chart.js for data visualization, enhancing the dashboard with graphical representations of file metrics.

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-repository/archivus-client.git
   ```
2. Install dependencies:
```bash
cd archivus-client
npm install
```
3. Start the development server:
```bash
npm run dev
```

## Development

To watch for changes in styles and automatically recompile TailwindCSS:
```bash
npm run tailwind
```
To format the codebase using Prettier:
```bash
npm run fmt
```
To lint your EJS templates for syntactic errors:
```bash
npm run lint
```

## Author
Developed by mpakholska, dedicated to enhancing user engagement and efficiency through robust web solutions.


