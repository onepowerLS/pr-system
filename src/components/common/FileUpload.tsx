import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Upload } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (files: File[]) => void;
  maxFiles?: number;
  accept?: Record<string, string[]>;
  className?: string;
}

export function FileUpload({
  onFileSelect,
  maxFiles = 1,
  accept = {
    'application/pdf': ['.pdf'],
    'image/png': ['.png'],
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/gif': ['.gif'],
    'application/rtf': ['.rtf'],
    'text/rtf': ['.rtf']
  },
  className,
}: FileUploadProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      onFileSelect(acceptedFiles);
    },
    [onFileSelect]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles,
    accept,
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        'border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary transition-colors',
        isDragActive ? 'border-primary bg-primary/5' : 'border-muted',
        className
      )}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-2">
        <Upload className="h-8 w-8 text-muted-foreground" />
        {isDragActive ? (
          <p>Drop the files here ...</p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Drag & drop files here, or click to select
            </p>
            <Button variant="outline" type="button">
              Select Files
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
