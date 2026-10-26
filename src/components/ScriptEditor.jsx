import Editor from '@monaco-editor/react';
import { useRef } from 'react';

export default function ScriptEditor({ item, connection }) {
    const editorRef = useRef(null);

    // TODO: اینجا باید اسکریپت واقعی را از Rust دریافت کنیم
    const defaultValue = `-- Script for ${item}\n-- Connection: ${connection?.name || 'none'}\n-- Backend not connected yet.`;

    return (
        <Editor
            height="100%"
            defaultLanguage="sql"
            defaultValue={defaultValue}
            onMount={(editor) => { editorRef.current = editor; }}
            options={{
                minimap: { enabled: false },
                fontSize: 13,
                wordWrap: 'on',
            }}
        />
    );
}