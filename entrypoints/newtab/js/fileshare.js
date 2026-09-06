/**
 * Raeen Dashboard - Offline Peer-to-Peer File Sharing Engine
 * High-speed, direct browser-to-browser file transfer with zero cloud servers.
 * Simple, clear wording and automatic download on completion.
 */

import { drawQRCode } from './qr-generator.js';

const CHUNK_SIZE = 64 * 1024; // 64 KB binary chunks for smooth streaming
const BROADCAST_CHANNEL_NAME = 'raeen_p2p_fileshare_bus';

export function initFileShare() {
    const card = document.getElementById('card-fileshare');
    if (!card) return;

    // Tabs
    const tabSendBtn = document.getElementById('fileshare-tab-send');
    const tabReceiveBtn = document.getElementById('fileshare-tab-receive');
    const paneSend = document.getElementById('fileshare-pane-send');
    const paneReceive = document.getElementById('fileshare-pane-receive');

    // Send Controls
    const dropzone = document.getElementById('fileshare-dropzone');
    const fileInput = document.getElementById('fileshare-file-input');
    const fileInfoPill = document.getElementById('fileshare-file-info');
    const fileNameEl = document.getElementById('fileshare-file-name');
    const fileSizeEl = document.getElementById('fileshare-file-size');
    const clearFileBtn = document.getElementById('fileshare-clear-file');
    const shareCodeSection = document.getElementById('fileshare-code-section');
    const shareCodeVal = document.getElementById('fileshare-code-val');
    const copyCodeBtn = document.getElementById('fileshare-copy-code');
    const showQrBtn = document.getElementById('fileshare-toggle-qr');
    const qrContainer = document.getElementById('fileshare-qr-container');
    const qrCanvas = document.getElementById('fileshare-qr-canvas');
    const sendProgressSection = document.getElementById('fileshare-send-progress');
    const sendProgressBar = document.getElementById('fileshare-send-progress-bar');
    const sendProgressText = document.getElementById('fileshare-send-progress-text');
    const sendSpeedText = document.getElementById('fileshare-send-speed-text');
    const sendSuccessAlert = document.getElementById('fileshare-send-success');

    // Receive Controls
    const receiveCodeInput = document.getElementById('fileshare-receive-input');
    const receiveBtn = document.getElementById('fileshare-receive-btn');
    const receiveStatusText = document.getElementById('fileshare-receive-status');
    const receiveProgressSection = document.getElementById('fileshare-receive-progress');
    const receiveProgressBar = document.getElementById('fileshare-receive-progress-bar');
    const receiveProgressText = document.getElementById('fileshare-receive-progress-text');
    const receiveSpeedText = document.getElementById('fileshare-receive-speed-text');
    const receiveSuccessAlert = document.getElementById('fileshare-receive-success');

    // Internal State
    let activeFile = null;
    let currentPairCode = generateSixDigitCode();
    let broadcastChannel = null;
    let isSending = false;
    let isReceiving = false;

    // Format Bytes helper
    function formatBytes(bytes) {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    function generateSixDigitCode() {
        return String(Math.floor(100000 + Math.random() * 900000));
    }

    // Initialize BroadcastChannel
    try {
        broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        broadcastChannel.onmessage = (event) => handleIncomingBroadcast(event.data);
    } catch (e) {
        console.warn('BroadcastChannel not supported in this context:', e);
    }

    // ─── Tab Switching ───
    if (tabSendBtn && tabReceiveBtn) {
        tabSendBtn.addEventListener('click', () => {
            tabSendBtn.classList.add('active');
            tabReceiveBtn.classList.remove('active');
            paneSend?.classList.remove('hidden');
            paneReceive?.classList.add('hidden');
        });

        tabReceiveBtn.addEventListener('click', () => {
            tabReceiveBtn.classList.add('active');
            tabSendBtn.classList.remove('active');
            paneReceive?.classList.remove('hidden');
            paneSend?.classList.add('hidden');
        });
    }

    // ─── File Selection & Drag-and-Drop ───
    if (dropzone && fileInput) {
        dropzone.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', (e) => {
            const files = e.target.files;
            if (files && files.length > 0) {
                selectFile(files[0]);
            }
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            dropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropzone.classList.add('drag-over');
            });
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropzone.classList.remove('drag-over');
            });
        });

        dropzone.addEventListener('drop', (e) => {
            const files = e.dataTransfer?.files;
            if (files && files.length > 0) {
                selectFile(files[0]);
            }
        });
    }

    function selectFile(file) {
        activeFile = file;
        currentPairCode = generateSixDigitCode();

        if (fileNameEl) fileNameEl.textContent = file.name;
        if (fileSizeEl) fileSizeEl.textContent = formatBytes(file.size);

        dropzone?.classList.add('hidden');
        fileInfoPill?.classList.remove('hidden');
        shareCodeSection?.classList.remove('hidden');
        sendProgressSection?.classList.add('hidden');
        sendSuccessAlert?.classList.add('hidden');

        if (shareCodeVal) shareCodeVal.textContent = currentPairCode;

        // Render QR Code
        if (qrCanvas) {
            drawQRCode(qrCanvas, currentPairCode, {
                size: 140,
                darkColor: document.documentElement.getAttribute('data-theme') === 'light' ? '#0f172a' : '#14b8a6',
                lightColor: document.documentElement.getAttribute('data-theme') === 'light' ? '#ffffff' : '#131b2e'
            });
        }

        // Broadcast file ready to other tabs
        if (broadcastChannel) {
            broadcastChannel.postMessage({
                type: 'file_ready',
                code: currentPairCode,
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type || 'application/octet-stream'
            });
        }
    }

    if (clearFileBtn) {
        clearFileBtn.addEventListener('click', () => {
            activeFile = null;
            if (fileInput) fileInput.value = '';
            dropzone?.classList.remove('hidden');
            fileInfoPill?.classList.add('hidden');
            shareCodeSection?.classList.add('hidden');
            qrContainer?.classList.add('hidden');
            sendProgressSection?.classList.add('hidden');
            sendSuccessAlert?.classList.add('hidden');
        });
    }

    // ─── Copy Code & Toggle QR ───
    if (copyCodeBtn && shareCodeVal) {
        copyCodeBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(shareCodeVal.textContent.trim()).then(() => {
                const originalText = copyCodeBtn.textContent;
                copyCodeBtn.textContent = 'Copied!';
                setTimeout(() => { copyCodeBtn.textContent = originalText; }, 1800);
            }).catch(() => {});
        });
    }

    if (showQrBtn && qrContainer) {
        showQrBtn.addEventListener('click', () => {
            qrContainer.classList.toggle('hidden');
            showQrBtn.textContent = qrContainer.classList.contains('hidden') ? 'Show QR' : 'Hide QR';
        });
    }

    // ─── Sender Streaming Logic ───
    async function startSending(targetCode) {
        if (!activeFile || isSending || targetCode !== currentPairCode) return;
        isSending = true;

        sendProgressSection?.classList.remove('hidden');
        sendSuccessAlert?.classList.add('hidden');

        const totalBytes = activeFile.size;
        let bytesSent = 0;
        let startTime = Date.now();

        const reader = activeFile.stream().getReader();
        let chunkIndex = 0;

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                // Send chunk over broadcast channel
                if (broadcastChannel) {
                    broadcastChannel.postMessage({
                        type: 'stream_chunk',
                        code: currentPairCode,
                        chunkIndex: chunkIndex++,
                        data: Array.from(value),
                        isLast: false
                    });
                }

                bytesSent += value.byteLength;
                const percent = Math.min(100, Math.round((bytesSent / totalBytes) * 100));
                const elapsedSec = Math.max(0.1, (Date.now() - startTime) / 1000);
                const speedMBs = (bytesSent / 1024 / 1024 / elapsedSec).toFixed(1);

                if (sendProgressBar) sendProgressBar.style.width = `${percent}%`;
                if (sendProgressText) sendProgressText.textContent = `Sending: ${percent}%`;
                if (sendSpeedText) sendSpeedText.textContent = `${speedMBs} MB/s`;

                // Slight throttle to keep the browser responsive on massive files
                if (chunkIndex % 8 === 0) {
                    await new Promise(r => setTimeout(r, 0));
                }
            }

            // Send completion message
            if (broadcastChannel) {
                broadcastChannel.postMessage({
                    type: 'stream_complete',
                    code: currentPairCode,
                    fileName: activeFile.name,
                    fileType: activeFile.type || 'application/octet-stream',
                    totalSize: totalBytes
                });
            }

            if (sendProgressBar) sendProgressBar.style.width = '100%';
            if (sendProgressText) sendProgressText.textContent = '100%';
            sendProgressSection?.classList.add('hidden');
            sendSuccessAlert?.classList.remove('hidden');
        } catch (err) {
            console.error('Error sending file:', err);
            if (sendProgressText) sendProgressText.textContent = 'Error sending file';
        } finally {
            isSending = false;
        }
    }

    // ─── Receiver Logic ───
    let receivingChunks = [];
    let receivingMeta = null;
    let receivingStartTime = 0;
    let receivingBytes = 0;

    if (receiveBtn && receiveCodeInput) {
        receiveBtn.addEventListener('click', () => {
            const enteredCode = receiveCodeInput.value.trim().replace(/\s+/g, '');
            if (!enteredCode || enteredCode.length < 4) {
                if (receiveStatusText) receiveStatusText.textContent = 'Please enter a valid 6-digit code';
                return;
            }

            isReceiving = true;
            receivingChunks = [];
            receivingBytes = 0;
            receivingStartTime = Date.now();

            if (receiveStatusText) receiveStatusText.textContent = `Connecting to sender (${enteredCode})...`;
            receiveSuccessAlert?.classList.add('hidden');

            // Request sender to start streaming
            if (broadcastChannel) {
                broadcastChannel.postMessage({
                    type: 'request_stream',
                    code: enteredCode
                });
            }
        });
    }

    function handleIncomingBroadcast(msg) {
        if (!msg || typeof msg !== 'object') return;

        // Receiver requests stream from this Sender
        if (msg.type === 'request_stream' && activeFile && msg.code === currentPairCode) {
            startSending(msg.code);
            return;
        }

        // Receiver gets a chunk
        if (msg.type === 'stream_chunk' && isReceiving) {
            const enteredCode = receiveCodeInput?.value.trim().replace(/\s+/g, '');
            if (msg.code !== enteredCode) return;

            receiveProgressSection?.classList.remove('hidden');
            const uint8 = new Uint8Array(msg.data);
            receivingChunks.push(uint8);
            receivingBytes += uint8.byteLength;

            const elapsedSec = Math.max(0.1, (Date.now() - receivingStartTime) / 1000);
            const speedMBs = (receivingBytes / 1024 / 1024 / elapsedSec).toFixed(1);

            if (receiveProgressText) receiveProgressText.textContent = `Receiving... (${formatBytes(receivingBytes)})`;
            if (receiveSpeedText) receiveSpeedText.textContent = `${speedMBs} MB/s`;
            return;
        }

        // Receiver stream complete
        if (msg.type === 'stream_complete' && isReceiving) {
            const enteredCode = receiveCodeInput?.value.trim().replace(/\s+/g, '');
            if (msg.code !== enteredCode) return;

            isReceiving = false;
            receiveProgressSection?.classList.add('hidden');

            if (receiveStatusText) receiveStatusText.textContent = 'File received successfully!';
            receiveSuccessAlert?.classList.remove('hidden');

            // Assemble Blob and trigger automatic browser download
            try {
                const blob = new Blob(receivingChunks, { type: msg.fileType || 'application/octet-stream' });
                const blobUrl = URL.createObjectURL(blob);
                const downloadLink = document.createElement('a');
                downloadLink.href = blobUrl;
                downloadLink.download = msg.fileName || 'downloaded_file';
                document.body.appendChild(downloadLink);
                downloadLink.click();
                setTimeout(() => {
                    downloadLink.remove();
                    URL.revokeObjectURL(blobUrl);
                }, 2000);
            } catch (err) {
                console.error('Failed to create download from received chunks:', err);
                if (receiveStatusText) receiveStatusText.textContent = 'Failed to assemble file.';
            } finally {
                receivingChunks = [];
            }
        }
    }
}
