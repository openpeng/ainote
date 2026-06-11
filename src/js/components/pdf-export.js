/**
 * PDF 导出功能
 */
export function exportToPDF() {
  const style = document.createElement('style');
  style.id = 'ainote-print-style';
  style.textContent = `
    @media print {
      #sidebar { display: none !important; }
      #ainote-toolbar { display: none !important; }
      #ainote-toolbar-actions { display: none !important; }
      #ainote-settings-panel { display: none !important; }
      #markdown-body {
        max-width: 100% !important;
        margin: 0 !important;
        padding: 20px !important;
      }
    }
  `;
  document.head.appendChild(style);

  window.print();

  setTimeout(() => {
    const printStyle = document.getElementById('ainote-print-style');
    if (printStyle) printStyle.remove();
  }, 1000);
}
