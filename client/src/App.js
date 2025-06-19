import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { dracula } from 'react-syntax-highlighter/dist/esm/styles/prism';

import * as pdfjsLib from 'pdfjs-dist';
pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@4.4.168/build/pdf.worker.mjs`;


function App() {
  const [prompt, setPrompt] = useState('');
  const [history, setHistory] = useState(() => {
    const savedHistory = sessionStorage.getItem('chatHistory');
    return savedHistory ? JSON.parse(savedHistory) : [];
  });
  const [loading, setLoading] = useState(false);
  const [attachment, setAttachment] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  
  const [selection, setSelection] = useState({ text: null, top: 0, left: 0 });
  const [activeQuote, setActiveQuote] = useState(null);

  const historyEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const promptTextareaRef = useRef(null); 

  useEffect(() => {
    document.body.className = theme + '-mode';
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, loading]);

  useEffect(() => {
    sessionStorage.setItem('chatHistory', JSON.stringify(history));
  }, [history]);
  
  const handleSelection = (e) => {
    const selectionObj = window.getSelection();
    const selectedText = selectionObj.toString().trim();

    if (!selectedText || selectedText.length <= 2) {
      setSelection({ text: null, top: 0, left: 0 });
      return;
    }

    const startNode = selectionObj.anchorNode;
    const endNode = selectionObj.focusNode;

    const startBubble = startNode?.parentElement.closest('.ai-bubble');
    const endBubble = endNode?.parentElement.closest('.ai-bubble');

    if (startBubble && startBubble === endBubble) {
      const historyContainer = document.querySelector('.history-container');
      const containerRect = historyContainer.getBoundingClientRect();

      const clientX = e.clientX || e.changedTouches[0].clientX;
      const clientY = e.clientY || e.changedTouches[0].clientY;

      const top = Math.max(5, clientY - containerRect.top + historyContainer.scrollTop - 50);
      const left = clientX - containerRect.left;

      setSelection({
        text: selectedText,
        top,
        left,
      });
    } else {
      setSelection({ text: null, top: 0, left: 0 });
    }
  };

  const handleQuoteButtonClick = () => {
    if (selection.text) {
      setActiveQuote(selection.text);
      setSelection({ text: null, top: 0, left: 0 });
      promptTextareaRef.current?.focus();
    }
  };

  const toBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = error => reject(error);
  });

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type.startsWith('text/')) {
        const fileSizeLimit = 150 * 1024;
        if (file.size > fileSizeLimit) {
            alert(`Document is too large. Please upload a file smaller than ${fileSizeLimit / 1024} KB to stay within the API token limit.`);
            e.target.value = null; 
            return;
        }
    }

    if (file.type.startsWith('image/')) {
      setAttachment({ file, preview: URL.createObjectURL(file), content: null, type: 'image' });
    } else if (file.type === 'application/pdf') {
        setLoading(true);
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const pdf = await pdfjsLib.getDocument(event.target.result).promise;
                let fullText = '';
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    fullText += textContent.items.map(item => item.str).join(' ') + '\n';
                }
                setAttachment({ file, preview: file.name, content: fullText, type: 'doc' });
            } catch (error) {
                console.error("Failed to parse PDF:", error);
                alert("Sorry, there was an error reading this PDF file.");
            } finally {
                setLoading(false);
            }
        };
        reader.readAsArrayBuffer(file);
    } else if (file.type.startsWith('text/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setAttachment({ file, preview: file.name, content: event.target.result, type: 'doc' });
      };
      reader.readAsText(file);
    } else {
      alert("Unsupported file type. Please upload an image, PDF, or a .txt/.md/.csv file.");
    }
    e.target.value = null;
  };
  
  const removeAttachment = () => {
    if (attachment && attachment.type === 'image') {
      URL.revokeObjectURL(attachment.preview);
    }
    setAttachment(null);
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!prompt.trim() || loading) return;

    setLoading(true);
    const historyForApi = [...history];
    
    const userPrompt = { 
      type: 'user', 
      text: prompt, 
      attachment: attachment ? { type: attachment.type, preview: attachment.preview } : null,
      quotedText: activeQuote
    };
    setHistory(prevHistory => [...prevHistory, userPrompt]);
    
    const currentPrompt = prompt;
    const currentAttachment = attachment;
    const currentQuote = activeQuote;
    setPrompt('');
    setAttachment(null);
    setActiveQuote(null);
    
    setHistory(prevHistory => [...prevHistory, { type: 'ai', text: '' }]);

    try {
      // Use relative paths for API calls
      let endpoint = '/api/generate';
      let body = {};
      
      let finalPromptText = currentPrompt;
      if (currentQuote) {
        finalPromptText = `Regarding this excerpt: "${currentQuote}"\n\nMy question is: ${currentPrompt}`;
      }

      if (currentAttachment?.type === 'image') {
        endpoint = '/api/vision';
        const imageBase64 = await toBase64(currentAttachment.file);
        body = { prompt: finalPromptText, image: imageBase64, mimeType: currentAttachment.file.type };
      } else if (currentAttachment?.type === 'doc') {
        const docPrompt = `Based on the following document:\n\n---\n${currentAttachment.content}\n---\n\n${finalPromptText}`;
        body = { prompt: docPrompt };
      } else {
        const formattedHistory = historyForApi
          .filter(item => item.type === 'user' || item.type === 'ai')
          .map(item => ({
            role: item.type === 'user' ? 'user' : 'model',
            parts: [{ text: item.text }]
          }));
        body = { prompt: finalPromptText, history: formattedHistory };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.body) throw new Error('Response body is missing');
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        const chunkText = decoder.decode(value);
        setHistory(prevHistory => {
          const newHistory = JSON.parse(JSON.stringify(prevHistory));
          newHistory[newHistory.length - 1].text += chunkText;
          return newHistory;
        });
      }

    } catch (error) {
      setHistory(prevHistory => {
        const newHistory = [...prevHistory];
        const lastItem = newHistory[newHistory.length - 1];
        if (lastItem && lastItem.type === 'ai' && lastItem.text === '') {
            lastItem.text = 'Something went wrong. Please try again.';
        } else {
            newHistory.push({ type: 'ai', text: 'Something went wrong. Please try again.' });
        }
        return newHistory;
      });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  
  const CodeBlock = ({ node, inline, className, children, ...props }) => {
    const [isCopied, setIsCopied] = useState(false);
    const match = /language-(\w+)/.exec(className || '');
    const codeText = String(children).replace(/\n$/, '');

    const handleCopy = () => {
      const textArea = document.createElement('textarea');
      textArea.value = codeText;
      textArea.style.position = 'fixed';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      } catch (err) {
        console.error('Fallback: Oops, unable to copy', err);
      }
      document.body.removeChild(textArea);
    };
    
    return !inline && match ? (
      <div className="code-block">
        <div className="code-header">
            <span>{match[1]}</span>
            <button onClick={handleCopy} className="copy-button">
              {isCopied ? 
                <><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg> Copied!</> : 
                <><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg> Copy</>
              }
            </button>
        </div>
        <SyntaxHighlighter
          style={dracula}
          language={match[1]}
          PreTag="div"
          {...props}
        >
          {codeText}
        </SyntaxHighlighter>
      </div>
    ) : (
      <code className={className} {...props}>
        {children}
      </code>
    );
  };
  
  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  return (
    <div className={`main-wrapper ${theme}`}>
      <main className="chat-container">
        <header className="chat-header">
            <div className="header-content">
                <h1 className="app-title">Elli</h1>
                <p className="app-subtitle">Your AI Learning Assistant by Rafi</p>
            </div>
          <button onClick={toggleTheme} className="theme-toggle-button">
            {theme === 'light' ? 
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg> : 
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
            }
          </button>
        </header>
        
        <div className="history-container" onMouseUp={(e) => handleSelection(e)} onTouchEnd={(e) => handleSelection(e.changedTouches[0])}>
          {history.length === 0 && !loading && (
            <div className="empty-chat-container">
              <div className="empty-chat-logo">🎓</div>
              <h2>How can I help you study today?</h2>
            </div>
          )}
          {history.map((item, index) => (
            <div key={index} className={`chat-bubble-wrapper ${item.type === 'user' ? 'user-wrapper' : 'ai-wrapper'}`}>
              <div className={`chat-bubble ${item.type === 'user' ? 'user-bubble' : 'ai-bubble'}`}>
                {item.type === 'ai' && <ReactMarkdown components={{code: CodeBlock}} remarkPlugins={[remarkGfm]}>{item.text}</ReactMarkdown>}
                {item.type === 'user' && (
                  <>
                    {item.quotedText && <div className="quoted-text-bubble">"{item.quotedText}"</div>}
                    {item.attachment?.type === 'image' && <img src={item.attachment.preview} alt="Prompt attachment" className="prompt-image-attachment"/>}
                    {item.attachment?.type === 'doc' && (
                      <div className="prompt-doc-attachment">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                        <span>{item.attachment.preview}</span>
                      </div>
                    )}
                    <div className="chat-text">{item.text}</div>
                  </>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="chat-bubble-wrapper ai-wrapper">
              <div className="chat-bubble ai-bubble">
                <div className="typing-indicator">
                  <span></span><span></span><span></span>
                </div>
              </div>
            </div>
          )}
           <div className={`quote-button-container ${selection.text ? 'visible' : ''}`}>
                <button className="quote-button" onClick={handleQuoteButtonClick}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/></svg>
                    Quote
                </button>
            </div>
          <div ref={historyEndRef} />
        </div>

        <div className="form-container">
          {activeQuote && !attachment && (
              <div className="quote-preview">
                  <span>Replying to:</span>
                  <p>"{activeQuote}"</p>
                  <button onClick={() => setActiveQuote(null)}>&times;</button>
              </div>
          )}
          {attachment && (
            <div className="preview-container">
              {attachment.type === 'image' ? (
                <img src={attachment.preview} alt="Preview" className="image-preview" />
              ) : (
                <div className="doc-preview">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                  <span>{attachment.preview}</span>
                </div>
              )}
              <button onClick={removeAttachment} className="remove-attachment-btn">&times;</button>
            </div>
          )}
          <form onSubmit={handleSubmit} className="prompt-form">
            <button type="button" className="attach-button" onClick={() => fileInputRef.current.click()} disabled={loading}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.59a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              style={{ display: 'none' }} 
              accept="image/*, .txt, .md, .csv, .pdf"
            />
            <textarea id="prompt-textarea" ref={promptTextareaRef} className="prompt-textarea" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Ask Elli anything..." rows="1" onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }} />
            <button type="submit" className="submit-button" disabled={loading || !prompt.trim()}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="m22 2-11 11"/></svg>
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

export default App;
