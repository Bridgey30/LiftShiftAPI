import React, { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { assetPath } from '../../../constants';

const BMC_IFRAME_URL =
  'https://www.buymeacoffee.com/widget/page/aree6?description=Support+me+on+Buy+me+a+coffee%21&color=%2340DCA5';

interface BuyMeACoffeeModalProps {
  isOpen: boolean;
  onClose: (supporter?: boolean) => void;
}

export const BuyMeACoffeeModal: React.FC<BuyMeACoffeeModalProps> = ({ isOpen, onClose }) => {
  const [confirming, setConfirming] = useState(false);
  const confirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setConfirming(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSupporterClick = () => {
    if (!confirming) {
      setConfirming(true);
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
      confirmTimerRef.current = setTimeout(() => setConfirming(false), 5000);
    } else {
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
      onClose(true);
    }
  };

  const resetConfirm = () => {
    if (confirming) {
      setConfirming(false);
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm overflow-y-auto overscroll-contain">
      <div className="min-h-full w-full px-3 sm:px-6 py-8 flex items-center justify-center">
        <div className="w-full max-w-lg mx-auto">
          <div className="relative bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <div className="flex items-center gap-2.5">
                <img
                  src={assetPath('/UI/logo.png')}
                  alt="LiftShift"
                  className="w-7 h-7 rounded"
                />
                <span className="text-sm font-semibold text-gray-900">
                  Support LiftShift&rsquo;s development.
                </span>
              </div>
              <button
                type="button"
                onClick={() => onClose()}
                className="w-8 h-8 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center text-red-400 hover:text-red-600 hover:ring-1 hover:ring-red-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div
              className="relative bg-white"
              style={{ height: 'min(600px, calc(100vh - 10rem))' }}
            >
              <iframe
                src={BMC_IFRAME_URL}
                title="Buy Me a Coffee"
                allow="payment; publickey-credentials-get *"
                className="w-full h-full border-0"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-top-navigation allow-popups-to-escape-sandbox"
              />
            </div>

            <div
              className="flex justify-center px-4 py-2 border-t border-gray-100 bg-gray-50"
              onMouseLeave={resetConfirm}
            >
              <button
                type="button"
                onClick={handleSupporterClick}
                className={`text-xs transition-colors ${
                  confirming
                    ? 'text-emerald-700 font-medium'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {confirming ? 'Are you sure?' : 'I already supported'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
