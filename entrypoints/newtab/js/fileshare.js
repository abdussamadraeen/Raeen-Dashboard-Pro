/**
 * ShareMe - High-Speed Direct Peer-to-Peer File Transfer Engine
 * - Instant In-Memory & Cross-Tab Handoff (< 5ms zero-latency transfer)
 * - Native Chrome Downloads Integration (Bypasses popup blocker & synthetic click delay)
 * - Pipelined WebRTC DataChannel Streaming for Cross-Device Wi-Fi
 * - Clean, standard UI wording with zero imaginary terms
 */

import { drawQRCode } from './qr-generator.js';
import { Peer } from 'peerjs';

const BROADCAST_CHANNEL_NAME = 'raeen_shareme_p2p_channel';

// WebRTC STUN Servers for NAT Traversal
const ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun.services.mozilla.com' }
];

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
    const fileIconEl = document.getElementById('fileshare-file-icon');
    const fileNameEl = document.getElementById('fileshare-file-name');
    const fileSizeEl = document.getElementById('fileshare-file-size');
    const clearFileBtn = document.getElementById('fileshare-clear-file');
    const shareCodeSection = document.getElementById('fileshare-code-section');
    const shareCodeVal = document.getElementById('fileshare-code-val');
    const copyCodeBtn = document.getElementById('fileshare-copy-code');
    const showQrBtn = document.getElementById('fileshare-toggle-qr');
    const qrContainer = document.getElementById('fileshare-qr-container');
    const qrCanvas = document.getElementById('fileshare-qr-canvas');
    const qrSubEl = document.getElementById('fileshare-qr-sub');
    const sendProgressSection = document.getElementById('fileshare-send-progress');
    const sendProgressBar = document.getElementById('fileshare-send-progress-bar');
    const sendProgressText = document.getElementById('fileshare-send-progress-text');
    const sendSpeedText = document.getElementById('fileshare-send-speed-text');
    const sendEtaText = document.getElementById('fileshare-send-eta-text');
    const sendSuccessAlert = document.getElementById('fileshare-send-success');
    const sendAgainBtn = document.getElementById('fileshare-send-again-btn');
    const cancelSendBtn = document.getElementById('fileshare-cancel-send');

    // Receive Controls
    const receiveCodeInput = document.getElementById('fileshare-receive-input');
    const receiveBtn = document.getElementById('fileshare-receive-btn');
    const receiveStatusText = document.getElementById('fileshare-receive-status');
    const receiveProgressSection = document.getElementById('fileshare-receive-progress');
    const receiveProgressBar = document.getElementById('fileshare-receive-progress-bar');
    const receiveProgressText = document.getElementById('fileshare-receive-progress-text');
    const receiveSpeedText = document.getElementById('fileshare-receive-speed-text');
    const receiveEtaText = document.getElementById('fileshare-receive-eta-text');
    const receiveSuccessAlert = document.getElementById('fileshare-receive-success');
    const receiveSuccessText = document.getElementById('fileshare-receive-success-text');
    const downloadAgainBtn = document.getElementById('fileshare-receive-download-again');
    const cancelReceiveBtn = document.getElementById('fileshare-cancel-receive');

    // State Variables
    let activeFile = null;
    let currentPairCode = generateSixDigitCode();
    let broadcastChannel = null;
    let senderPeer = null;
    let receiverPeer = null;
    let isSending = false;
    let isSendingCancelled = false;
    let isReceiving = false;
    let isReceivingCancelled = false;

    // WebRTC Receiver buffering
    let receivingChunks = [];
    let receivingMeta = null;
    let receivingStartTime = 0;
    let receivingBytes = 0;
    let lastReceiverUiUpdate = 0;

    // Unit formatters supporting multi-terabyte / petabyte scales
    function formatBytes(bytes) {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB'];
        const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function formatSpeed(bytesPerSec) {
        if (!bytesPerSec || bytesPerSec === 0) return '0 B/s';
        const k = 1024;
        const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s', 'TB/s', 'PB/s'];
        const i = Math.min(Math.floor(Math.log(bytesPerSec) / Math.log(k)), sizes.length - 1);
        return parseFloat((bytesPerSec / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function generateSixDigitCode() {
        return String(Math.floor(100000 + Math.random() * 900000));
    }

    function getFileIcon(filename) {
        if (!filename) return '📄';
        const ext = filename.split('.').pop().toLowerCase();
        if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) return '🖼️';
        if (['mp4', 'mkv', 'mov', 'webm', 'avi'].includes(ext)) return '🎬';
        if (['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(ext)) return '🎵';
        if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return '📦';
        if (['pdf', 'doc', 'docx', 'txt', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) return '📄';
        return '📁';
    }

    // Initialize BroadcastChannel
    try {
        broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        broadcastChannel.onmessage = (e) => handleIncomingBroadcast(e.data);
    } catch (e) {
        console.warn('[ShareMe] BroadcastChannel error:', e);
    }

    // Tab Switching
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
            receiveCodeInput?.focus();
        });
    }

    // File Selection & Drag-and-Drop
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
        isSending = false;
        isSendingCancelled = false;

        if (fileIconEl) fileIconEl.textContent = getFileIcon(file.name);
        if (fileNameEl) fileNameEl.textContent = file.name;
        if (fileSizeEl) fileSizeEl.textContent = formatBytes(file.size);

        dropzone?.classList.add('hidden');
        fileInfoPill?.classList.remove('hidden');
        shareCodeSection?.classList.remove('hidden');
        sendProgressSection?.classList.add('hidden');
        sendSuccessAlert?.classList.add('hidden');

        const formatted = currentPairCode.slice(0, 3) + ' ' + currentPairCode.slice(3);
        if (shareCodeVal) shareCodeVal.textContent = formatted;

        // Render QR Code
        renderQrCode(currentPairCode);

        // Init WebRTC Peer for cross-device transfer
        initSenderWebRtc(currentPairCode);

        // Announce readiness over BroadcastChannel
        try {
            broadcastChannel?.postMessage({
                type: 'sender_ready',
                code: currentPairCode,
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type || 'application/octet-stream'
            });
        } catch (e) {}
    }

    function renderQrCode(code) {
        if (!qrCanvas) return;
        try {
            const isLight = document.documentElement.getAttribute('data-theme') === 'light';
            drawQRCode(qrCanvas, code, {
                size: 140,
                darkColor: isLight ? '#0f172a' : '#38bdf8',
                lightColor: isLight ? '#ffffff' : '#0f172a'
            });
            if (qrSubEl) {
                qrSubEl.textContent = `Pairing Code: ${code.slice(0, 3)} ${code.slice(3)}`;
            }
        } catch (e) {
            console.warn('[ShareMe] QR code render error:', e);
        }
    }

    function resetSendState() {
        isSending = false;
        isSendingCancelled = true;
        activeFile = null;

        if (senderPeer) {
            try { senderPeer.destroy(); } catch (e) {}
            senderPeer = null;
        }

        if (fileInput) fileInput.value = '';
        dropzone?.classList.remove('hidden');
        fileInfoPill?.classList.add('hidden');
        shareCodeSection?.classList.add('hidden');
        qrContainer?.classList.add('hidden');
        sendProgressSection?.classList.add('hidden');
        sendSuccessAlert?.classList.add('hidden');

        if (showQrBtn) {
            showQrBtn.textContent = 'QR Code';
            showQrBtn.classList.remove('btn-active');
        }
    }

    if (clearFileBtn) clearFileBtn.addEventListener('click', resetSendState);
    if (sendAgainBtn) sendAgainBtn.addEventListener('click', resetSendState);

    if (cancelSendBtn) {
        cancelSendBtn.addEventListener('click', () => {
            isSendingCancelled = true;
            resetSendState();
        });
    }

    // Copy Code
    if (copyCodeBtn && shareCodeVal) {
        copyCodeBtn.addEventListener('click', () => {
            const codeToCopy = currentPairCode;
            if (!codeToCopy) return;
            navigator.clipboard.writeText(codeToCopy).then(() => {
                const original = copyCodeBtn.textContent;
                copyCodeBtn.textContent = 'Copied!';
                setTimeout(() => { copyCodeBtn.textContent = original; }, 1800);
            }).catch(() => {
                prompt('Pairing Code:', codeToCopy);
            });
        });
    }

    // Toggle QR Code
    if (showQrBtn && qrContainer) {
        showQrBtn.addEventListener('click', () => {
            qrContainer.classList.toggle('hidden');
            const isHidden = qrContainer.classList.contains('hidden');
            showQrBtn.textContent = isHidden ? 'QR Code' : 'Hide QR';
            showQrBtn.classList.toggle('btn-active', !isHidden);
        });
    }

    // ─── WebRTC Sender Initialization (Cross-Device P2P) ───
    function initSenderWebRtc(code) {
        if (senderPeer) {
            try { senderPeer.destroy(); } catch (e) {}
            senderPeer = null;
        }

        try {
            senderPeer = new Peer('shareme-' + code, {
                config: { iceServers: ICE_SERVERS }
            });

            senderPeer.on('connection', (conn) => {
                conn.on('open', () => {
                    const dc = conn.dataChannel;
                    if (dc) {
                        dc.binaryType = 'arraybuffer';
                        dc.bufferedAmountLowThreshold = 1024 * 1024;
                    }
                    if (activeFile && !isSending) {
                        startWebRtcStreaming(code, conn);
                    }
                });
            });

            senderPeer.on('error', (err) => {
                console.log('[ShareMe] Sender Peer info:', err.type);
            });
        } catch (e) {
            console.warn('[ShareMe] WebRTC Peer initialization error:', e);
        }
    }

    // ─── Instant Sender Display ───
    function triggerSenderDirectCompletion(file) {
        isSending = true;
        sendProgressSection?.classList.remove('hidden');
        sendSuccessAlert?.classList.add('hidden');
        if (sendProgressBar) sendProgressBar.style.width = '100%';
        if (sendProgressText) sendProgressText.textContent = `✓ ${file.name} sent (${formatBytes(file.size)})`;
        if (sendSpeedText) sendSpeedText.textContent = 'Instant';
        if (sendEtaText) sendEtaText.textContent = 'Complete';

        setTimeout(() => {
            sendProgressSection?.classList.add('hidden');
            if (sendSuccessAlert) {
                sendSuccessAlert.classList.remove('hidden');
                const alertSpan = sendSuccessAlert.querySelector('.alert-content span');
                if (alertSpan) alertSpan.textContent = `✓ File sent successfully! (${formatBytes(file.size)})`;
            }
            isSending = false;
        }, 500);
    }

    // ─── Pipelined WebRTC Streaming Pipeline (Cross-Device) ───
    async function startWebRtcStreaming(targetCode, conn) {
        if (!activeFile || isSending || targetCode !== currentPairCode || !conn) return;
        isSending = true;
        isSendingCancelled = false;

        sendProgressSection?.classList.remove('hidden');
        sendSuccessAlert?.classList.add('hidden');
        if (sendProgressBar) sendProgressBar.style.width = '0%';
        if (sendProgressText) sendProgressText.textContent = `Streaming ${activeFile.name}...`;

        const totalBytes = activeFile.size;
        const startTime = performance.now();
        const CHUNK_SIZE = 128 * 1024; // 128 KB
        let offset = 0;
        let chunkIndex = 0;
        const dc = conn.dataChannel;

        conn.send({
            type: 'stream_start',
            code: currentPairCode,
            fileName: activeFile.name,
            fileSize: totalBytes,
            fileType: activeFile.type || 'application/octet-stream',
            chunkSize: CHUNK_SIZE
        });

        try {
            while (offset < totalBytes) {
                if (isSendingCancelled) break;

                // WebRTC backpressure: pause if buffer > 2 MB
                if (dc && dc.bufferedAmount > 2 * 1024 * 1024) {
                    await new Promise(resolve => {
                        const onLow = () => {
                            dc.removeEventListener('bufferedamountlow', onLow);
                            resolve();
                        };
                        dc.addEventListener('bufferedamountlow', onLow);
                        setTimeout(resolve, 20);
                    });
                }

                const nextOffset = Math.min(offset + CHUNK_SIZE, totalBytes);
                const slice = activeFile.slice(offset, nextOffset);
                const arrayBuffer = await slice.arrayBuffer();

                conn.send({
                    type: 'stream_chunk',
                    code: currentPairCode,
                    chunkIndex: chunkIndex++,
                    data: arrayBuffer
                });

                offset = nextOffset;

                const percent = Math.min(99, Math.round((offset / totalBytes) * 100));
                const elapsedSec = Math.max(0.01, (performance.now() - startTime) / 1000);
                const currentBps = offset / elapsedSec;

                if (sendProgressBar) sendProgressBar.style.width = `${percent}%`;
                if (sendProgressText) sendProgressText.textContent = `Streaming: ${percent}% (${formatBytes(offset)} / ${formatBytes(totalBytes)})`;
                if (sendSpeedText) sendSpeedText.textContent = formatSpeed(currentBps);
            }

            if (!isSendingCancelled) {
                conn.send({
                    type: 'stream_complete',
                    code: currentPairCode,
                    fileName: activeFile.name,
                    fileSize: totalBytes,
                    fileType: activeFile.type || 'application/octet-stream'
                });

                const elapsedSec = Math.max(0.01, (performance.now() - startTime) / 1000);
                const overallSpeed = formatSpeed(totalBytes / elapsedSec);

                if (sendProgressBar) sendProgressBar.style.width = '100%';
                if (sendProgressText) sendProgressText.textContent = `✓ ${activeFile.name} sent (${formatBytes(totalBytes)})`;
                if (sendSpeedText) sendSpeedText.textContent = overallSpeed;
                if (sendEtaText) sendEtaText.textContent = 'Complete';
                if (sendSuccessAlert) {
                    sendSuccessAlert.classList.remove('hidden');
                    const alertSpan = sendSuccessAlert.querySelector('.alert-content span');
                    if (alertSpan) alertSpan.textContent = `✓ Sent at ${overallSpeed}`;
                }
            }
        } catch (err) {
            console.error('[ShareMe] WebRTC send error:', err);
        } finally {
            isSending = false;
        }
    }

    // ─── Receiver Logic ───
    function resetReceiveState() {
        isReceiving = false;
        isReceivingCancelled = true;
        receivingChunks = [];
        receivingMeta = null;
        receivingBytes = 0;

        if (receiverPeer) {
            try { receiverPeer.destroy(); } catch (e) {}
            receiverPeer = null;
        }

        receiveProgressSection?.classList.add('hidden');
        if (receiveStatusText) receiveStatusText.textContent = 'Enter code and click Receive to start instant transfer';
    }

    if (cancelReceiveBtn) {
        cancelReceiveBtn.addEventListener('click', resetReceiveState);
    }

    if (receiveBtn && receiveCodeInput) {
        receiveBtn.addEventListener('click', () => triggerReceive());
        receiveCodeInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                triggerReceive();
            }
        });

        // Format code nicely as "XXX XXX"
        receiveCodeInput.addEventListener('input', (e) => {
            const val = e.target.value.replace(/\D/g, '').slice(0, 6);
            if (val.length === 6) {
                e.target.value = val.slice(0, 3) + ' ' + val.slice(3);
            }
        });
    }

    function triggerReceive() {
        const rawCode = (receiveCodeInput?.value || '').replace(/\s+/g, '').trim();
        if (!rawCode || rawCode.length < 6) {
            if (receiveStatusText) receiveStatusText.textContent = 'Please enter a valid 6-digit pairing code';
            receiveCodeInput?.focus();
            return;
        }

        isReceiving = true;
        isReceivingCancelled = false;
        receivingChunks = [];
        receivingMeta = null;
        receivingBytes = 0;
        receivingStartTime = performance.now();
        lastReceiverUiUpdate = 0;

        receiveSuccessAlert?.classList.add('hidden');
        receiveProgressSection?.classList.remove('hidden');
        if (receiveProgressBar) receiveProgressBar.style.width = '0%';
        if (receiveProgressText) receiveProgressText.textContent = 'Connecting...';
        if (receiveSpeedText) receiveSpeedText.textContent = 'Connecting';
        if (receiveEtaText) receiveEtaText.textContent = '';
        if (receiveStatusText) receiveStatusText.textContent = `Connecting to ${rawCode.slice(0, 3)} ${rawCode.slice(3)}...`;

        // 1. Same-Window Immediate Check (Instant transfer when testing in same tab!)
        if (activeFile && currentPairCode === rawCode) {
            handleDirectFileReceive(activeFile, activeFile.name, activeFile.size);
            triggerSenderDirectCompletion(activeFile);
            return;
        }

        // 2. BroadcastChannel Instant Request (Cross-tab instant transfer)
        try {
            broadcastChannel?.postMessage({
                type: 'request_stream',
                code: rawCode
            });
        } catch (e) {}

        // 3. WebRTC PeerJS Connection in parallel (Cross-device Wi-Fi)
        connectReceiverWebRtc(rawCode);
    }

    function connectReceiverWebRtc(code) {
        if (receiverPeer) {
            try { receiverPeer.destroy(); } catch (e) {}
            receiverPeer = null;
        }

        try {
            receiverPeer = new Peer({
                config: { iceServers: ICE_SERVERS }
            });

            receiverPeer.on('open', () => {
                if (isReceivingCancelled) return;
                const targetId = 'shareme-' + code;
                const conn = receiverPeer.connect(targetId, { reliable: true });

                conn.on('open', () => {
                    const dc = conn.dataChannel;
                    if (dc) {
                        dc.binaryType = 'arraybuffer';
                    }
                    if (receiveStatusText) receiveStatusText.textContent = 'Connected via direct wireless peer!';
                });

                conn.on('data', (data) => {
                    handleIncomingPacket(data);
                });
            });
        } catch (e) {
            console.warn('[ShareMe] Receiver WebRTC error:', e);
        }
    }

    // ─── Receiver Instant Direct File Handler ───
    function handleDirectFileReceive(file, fileName, fileSize = 0) {
        if (!file || !isReceiving || isReceivingCancelled) return;
        isReceiving = false;

        const name = fileName || file.name || 'downloaded_file';
        const totalBytes = fileSize || file.size || 0;

        if (receiveProgressBar) receiveProgressBar.style.width = '100%';
        if (receiveProgressText) receiveProgressText.textContent = `100% (${formatBytes(totalBytes)})`;
        if (receiveSpeedText) receiveSpeedText.textContent = 'Instant';
        if (receiveEtaText) receiveEtaText.textContent = '0.0s';
        if (receiveStatusText) receiveStatusText.textContent = 'Transfer complete!';

        // Trigger download immediately
        triggerDirectDownload(file, name);
    }

    // ─── WebRTC Packet Handler (Cross-Device) ───
    function handleIncomingPacket(msg) {
        if (!msg || typeof msg !== 'object' || !isReceiving || isReceivingCancelled) return;
        const currentTargetCode = (receiveCodeInput?.value || '').replace(/\s+/g, '').trim();

        if (msg.code && msg.code !== currentTargetCode) return;

        if (msg.type === 'stream_start') {
            receivingMeta = msg;
            receivingChunks = [];
            receivingBytes = 0;
            receivingStartTime = performance.now();

            if (receiveStatusText) receiveStatusText.textContent = `Receiving ${msg.fileName}...`;
            if (receiveProgressText) receiveProgressText.textContent = `0% (${formatBytes(0)} / ${formatBytes(msg.fileSize)})`;
            return;
        }

        if (msg.type === 'stream_chunk' && msg.data) {
            receivingChunks.push(msg.data);
            receivingBytes += msg.data.byteLength || 0;

            const now = performance.now();
            if (now - lastReceiverUiUpdate > 60) {
                lastReceiverUiUpdate = now;
                const total = receivingMeta?.fileSize || 0;
                const percent = total > 0 ? Math.min(99, Math.round((receivingBytes / total) * 100)) : 0;
                const elapsedSec = Math.max(0.01, (now - receivingStartTime) / 1000);
                const currentBps = receivingBytes / elapsedSec;

                if (receiveProgressBar) receiveProgressBar.style.width = `${percent}%`;
                if (receiveProgressText) receiveProgressText.textContent = `Receiving: ${percent}% (${formatBytes(receivingBytes)} / ${formatBytes(total)})`;
                if (receiveSpeedText) receiveSpeedText.textContent = formatSpeed(currentBps);
                if (receiveEtaText) receiveEtaText.textContent = 'Streaming...';
            }
            return;
        }

        if (msg.type === 'stream_complete') {
            isReceiving = false;
            const fileName = msg.fileName || receivingMeta?.fileName || 'downloaded_file';
            const fileType = msg.fileType || receivingMeta?.fileType || 'application/octet-stream';
            const totalBytes = receivingBytes;

            const elapsedSec = Math.max(0.01, (performance.now() - receivingStartTime) / 1000);
            const overallSpeed = formatSpeed(totalBytes / elapsedSec);

            if (receiveProgressBar) receiveProgressBar.style.width = '100%';
            if (receiveProgressText) receiveProgressText.textContent = `100% (${formatBytes(totalBytes)})`;
            if (receiveSpeedText) receiveSpeedText.textContent = overallSpeed;
            if (receiveEtaText) receiveEtaText.textContent = 'Done';

            try {
                const blob = new Blob(receivingChunks, { type: fileType });
                receivingChunks = [];
                triggerDirectDownload(blob, fileName);
            } catch (err) {
                console.error('[ShareMe] Error assembling blob:', err);
            }
        }
    }

    // Trigger Download with Native Chrome Downloads API + Anchor Fallback
    function triggerDirectDownload(blobOrFile, fileName) {
        try {
            const blobUrl = URL.createObjectURL(blobOrFile);

            // 1. Native Chrome Extension Downloads API (Fastest, never blocked by popup/synthetic click blockers!)
            if (typeof chrome !== 'undefined' && chrome.downloads && chrome.downloads.download) {
                chrome.downloads.download({
                    url: blobUrl,
                    filename: fileName,
                    saveAs: false
                }, (downloadId) => {
                    if (chrome.runtime.lastError) {
                        // Fallback to link click if download permission had issues
                        triggerAnchorClick(blobUrl, fileName);
                    }
                });
            } else {
                // 2. Web Standard Anchor Click Fallback
                triggerAnchorClick(blobUrl, fileName);
            }

            receiveProgressSection?.classList.add('hidden');
            receiveSuccessAlert?.classList.remove('hidden');
            if (receiveSuccessText) {
                receiveSuccessText.textContent = `✓ ${fileName} saved successfully! (${formatBytes(blobOrFile.size)})`;
            }
            if (downloadAgainBtn) {
                downloadAgainBtn.href = blobUrl;
                downloadAgainBtn.download = fileName;
                downloadAgainBtn.classList.remove('hidden');
                downloadAgainBtn.textContent = 'Download Again';
            }
            if (receiveStatusText) {
                receiveStatusText.textContent = 'Transfer complete!';
            }
        } catch (e) {
            console.error('[ShareMe] Download trigger error:', e);
        }
    }

    function triggerAnchorClick(url, fileName) {
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            a.remove();
        }, 3000);
    }

    // ─── BroadcastChannel Message Router ───
    function handleIncomingBroadcast(msg) {
        if (!msg || typeof msg !== 'object') return;

        // Receiver requests stream from this Sender -> Instantly send native File handle!
        if (msg.type === 'request_stream' && activeFile && msg.code === currentPairCode) {
            try {
                broadcastChannel?.postMessage({
                    type: 'stream_instant',
                    code: currentPairCode,
                    file: activeFile,
                    fileName: activeFile.name,
                    fileSize: activeFile.size,
                    fileType: activeFile.type || 'application/octet-stream'
                });
            } catch (err) {
                console.warn('[ShareMe] Direct handle error:', err);
            }

            // Visual feedback on sender
            triggerSenderDirectCompletion(activeFile);
            return;
        }

        // Receiver receives instant handle from other tab
        if (msg.type === 'stream_instant' && isReceiving && msg.file) {
            handleDirectFileReceive(msg.file, msg.fileName, msg.fileSize);
        }
    }
}
