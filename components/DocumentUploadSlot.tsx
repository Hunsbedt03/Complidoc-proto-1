'use client';

import { useRef, useState } from 'react';
import type { UploadRequirement } from '@/lib/documents/uploadRequirements';
import {
  downloadUploadedFile,
  formatFileSize,
  uploadProjectDocument,
} from '@/lib/storage/uploadDocument';
import type { UploadSlot } from '@/lib/types';

type Props = {
  requirement: UploadRequirement;
  projectId: string;
  slot: UploadSlot | undefined;
  onUploadComplete: (slot: UploadSlot) => void;
  disabled?: boolean;
  /** Kun drop-sone uten overskrift (under arkiv-varsel) */
  compact?: boolean;
};

function extOf(name: string): string {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i + 1).toLowerCase() : '';
}

export function DocumentUploadSlot({
  requirement,
  projectId,
  slot,
  onUploadComplete,
  disabled = false,
  compact = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const status = slot?.status ?? 'missing';
  const accepted = requirement.acceptedFormats;
  const acceptAttr = accepted.map((e) => `.${e}`).join(',');

  async function processFile(file: File) {
    const ext = extOf(file.name);
    if (accepted.length && !accepted.includes(ext)) {
      setError(
        `Filformat .${ext} støttes ikke. Tillatt: ${accepted.map((a) => '.' + a).join(', ')}`
      );
      onUploadComplete({
        documentId: requirement.id,
        status: 'error',
        errorMessage: 'Ugyldig filformat',
      });
      return;
    }

    setError(null);
    setUploading(true);
    onUploadComplete({
      documentId: requirement.id,
      status: 'uploading',
      fileName: file.name,
    });

    try {
      const { slot: uploaded, storage } = await uploadProjectDocument(
        projectId,
        requirement.id,
        file
      );
      onUploadComplete(uploaded);
      if (storage === 'local') {
        setError(null);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Opplasting feilet';
      setError(msg);
      onUploadComplete({
        documentId: requirement.id,
        status: 'error',
        fileName: file.name,
        errorMessage: msg,
      });
    } finally {
      setUploading(false);
    }
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void processFile(file);
    e.target.value = '';
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (disabled || uploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) void processFile(file);
  }

  const showUploaded = status === 'uploaded' && slot?.fileName;
  const showError = status === 'error' || error;
  const missingRequired = requirement.required && !showUploaded;

  return (
    <div
      className={
        'upload-slot ' +
        (compact ? 'upload-slot--compact ' : '') +
        (showUploaded
          ? 'upload-slot--ok'
          : showError
            ? 'upload-slot--error'
            : missingRequired
              ? 'upload-slot--warn'
              : 'upload-slot--empty')
      }
    >
      {!compact ? (
        <>
          <div className="upload-slot-head">
            <span className="upload-slot-title">
              📎 {requirement.label}
            </span>
            <span
              className={
                requirement.required ? 'upload-slot-req' : 'upload-slot-optional'
              }
            >
              {requirement.required ? 'Påkrevd' : 'Anbefalt'}
            </span>
          </div>
          <p className="upload-slot-desc">{requirement.description}</p>
          <p className="upload-slot-reason">
            <span className="upload-slot-reason-icon">ℹ️</span> {requirement.reason}
          </p>
        </>
      ) : (
        <p className="upload-slot-compact-label">Kun dette prosjektet:</p>
      )}

      {!compact && requirement.requiredContent?.length ? (
        <div className="upload-slot-required-content">
          <p className="upload-slot-required-title">Må inneholde:</p>
          <ul className="upload-slot-required-list">
            {requirement.requiredContent.map((item) => (
              <li key={item} className="upload-slot-required-item">
                <span className="upload-slot-required-check" aria-hidden>
                  ✓
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {uploading ? (
        <div className="upload-slot-progress">
          <div className="upload-slot-progress-bar" />
          <p className="upload-slot-progress-text">
            Laster opp {slot?.fileName ?? '…'}
          </p>
        </div>
      ) : showUploaded ? (
        <div className="upload-slot-filled">
          <div className="upload-slot-fileinfo">
            <span className="upload-slot-fileicon">📄</span>
            <div>
              <div className="upload-slot-filename">{slot.fileName}</div>
              <div className="upload-slot-date">
                {slot.uploadedAt
                  ? new Date(slot.uploadedAt).toLocaleString('nb-NO')
                  : '—'}
                {slot.fileSize ? ` · ${formatFileSize(slot.fileSize)}` : ''}
              </div>
            </div>
          </div>
          <div className="upload-slot-actions">
            <button
              type="button"
              className="btn-dl"
              onClick={() => void downloadUploadedFile(slot)}
            >
              Last ned
            </button>
            {!disabled ? (
              <button
                type="button"
                className="btn-cancel upload-slot-replace"
                onClick={() => inputRef.current?.click()}
              >
                Erstatt
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          className={
            'upload-slot-drop' +
            (dragOver ? ' upload-slot-drop--active' : '') +
            (disabled ? ' upload-slot-drop--disabled' : '')
          }
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !disabled && inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
        >
          <span className="upload-slot-uploadicon">↑</span>
          <p>
            Dra og slipp eller{' '}
            <span className="upload-slot-link">klikk for å velge fil</span>
          </p>
          <span className="upload-slot-formats">
            {accepted.map((a) => '.' + a).join(' · ')}
          </span>
        </div>
      )}

      {showError ? (
        <p className="upload-slot-alert">
          {slot?.errorMessage ?? error ?? 'Opplasting feilet'}
          {!disabled ? (
            <>
              {' '}
              <button
                type="button"
                className="upload-slot-retry"
                onClick={() => inputRef.current?.click()}
              >
                Prøv igjen
              </button>
            </>
          ) : null}
        </p>
      ) : missingRequired && !uploading ? (
        <p className="upload-slot-alert upload-slot-alert--muted">
          Obligatorisk før låsing av pakken
        </p>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        className="upload-slot-input"
        accept={acceptAttr}
        disabled={disabled || uploading}
        onChange={onInputChange}
        aria-label={`Last opp ${requirement.label}`}
      />
    </div>
  );
}
