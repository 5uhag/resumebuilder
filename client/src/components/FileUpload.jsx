import { useState } from 'react';

const MAX_FILE_SIZE_MB = 50;

export default function FileUpload({ onSubmit, state }) {
  const [consent, setConsent] = useState(false);
  const [file, setFile] = useState(null);
  const [localError, setLocalError] = useState('');

  const isBusy = state === 'loading';

  function handleFileChange(event) {
    const nextFile = event.target.files?.[0] ?? null;
    setLocalError('');
    setFile(nextFile);

    if (!nextFile) {
      return;
    }

    if (!nextFile.name.toLowerCase().endsWith('.pdf')) {
      setLocalError('Select a PDF export from LinkedIn or another resume source.');
      setFile(null);
      return;
    }

    if (nextFile.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setLocalError(`PDF is too large. Keep it under ${MAX_FILE_SIZE_MB}MB.`);
      setFile(null);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!file) {
      setLocalError('Pick a PDF before starting the parse.');
      return;
    }

    if (!consent) {
      setLocalError('Confirm that the PDF can be processed.');
      return;
    }

    setLocalError('');
    await onSubmit(file);
  }

  return (
    <form className="panel-card form-card" onSubmit={handleSubmit}>
      <p className="section-kicker">Step 1</p>
      <h3>Parse a profile PDF</h3>
      <p>Upload a LinkedIn PDF and map it into JSON Resume structure.</p>

      <label className="field-block" htmlFor="resume-upload">
        <span>PDF file</span>
        <input accept="application/pdf,.pdf" id="resume-upload" type="file" onChange={handleFileChange} />
      </label>

      <label className="consent-row">
        <input checked={consent} type="checkbox" onChange={(event) => setConsent(event.target.checked)} />
        <span>I consent to sending this PDF to the parsing service.</span>
      </label>

      <div className="file-meta">
        <span>{file ? file.name : 'No file selected yet'}</span>
        <span>{file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : `Limit ${MAX_FILE_SIZE_MB} MB`}</span>
      </div>

      {localError ? <p className="inline-error">{localError}</p> : null}

      <button className="primary-button" disabled={isBusy} type="submit">
        {isBusy ? 'Parsing PDF...' : 'Parse PDF into resume'}
      </button>
    </form>
  );
}