// File operations utilities
import fs from 'fs';
import path from 'path';

export class FileOperations {
  static ensureDirectoryExists(filePath) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  static resolvePath(filePath) {
    return path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  }

  static writeFile(filePath, content, options = {}) {
    const { append = false, addNewline = true } = options;
    const absolutePath = this.resolvePath(filePath);
    
    this.ensureDirectoryExists(absolutePath);
    
    if (append) {
      const contentToWrite = addNewline ? '\n' + content : content;
      fs.appendFileSync(absolutePath, contentToWrite, 'utf8');
    } else {
      fs.writeFileSync(absolutePath, content, 'utf8');
    }
    
    return {
      success: true,
      path: absolutePath,
      operation: append ? 'append' : 'write'
    };
  }

  static readFile(filePath, options = {}) {
    const absolutePath = this.resolvePath(filePath);
    
    if (!fs.existsSync(absolutePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    const content = fs.readFileSync(absolutePath, 'utf8');
    
    return {
      success: true,
      path: absolutePath,
      content: content
    };
  }

  static touchFile(filePath) {
    const absolutePath = this.resolvePath(filePath);
    
    this.ensureDirectoryExists(absolutePath);
    
    if (!fs.existsSync(absolutePath)) {
      fs.writeFileSync(absolutePath, '', 'utf8');
      return {
        success: true,
        path: absolutePath,
        created: true
      };
    } else {
      return {
        success: true,
        path: absolutePath,
        created: false,
        message: 'File already exists'
      };
    }
  }

  static fileExists(filePath) {
    const absolutePath = this.resolvePath(filePath);
    return fs.existsSync(absolutePath);
  }
}
