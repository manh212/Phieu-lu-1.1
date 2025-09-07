// components/gameplay/PaginationControls.tsx
import React, { useState, useRef, useEffect, ChangeEvent } from 'react';
import Button from '../ui/Button';
import { VIETNAMESE } from '../../constants';

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
  onJump: (page: number) => void;
  disabled?: boolean;
}

const PaginationControls: React.FC<PaginationControlsProps> = ({ currentPage, totalPages, onPrev, onNext, onJump, disabled }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [jumpToPageInput, setJumpToPageInput] = useState<string>(currentPage.toString());
    const menuRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        setJumpToPageInput(currentPage.toString());
    }, [currentPage]);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleJumpInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        setJumpToPageInput(e.target.value);
    };

    const handleJumpSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const pageNum = parseInt(jumpToPageInput, 10);
        if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
            onJump(pageNum);
            setIsMenuOpen(false);
        }
    };

    if (totalPages <= 1) {
        return null;
    }

    return (
        <div className="flex items-center justify-center gap-2">
            <Button
                onClick={onPrev}
                disabled={disabled || currentPage <= 1}
                size="sm"
                variant="secondary"
                className="!px-3"
                title={VIETNAMESE.previousPage}
            >
                &larr;
            </Button>

            <div ref={menuRef} className="relative">
                <Button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    disabled={disabled}
                    size="sm"
                    variant="secondary"
                    className="!px-4 tabular-nums"
                    aria-haspopup="true"
                    aria-expanded={isMenuOpen}
                >
                    {VIETNAMESE.pageIndicator(currentPage, totalPages)}
                </Button>
                {isMenuOpen && (
                    <div className="absolute bottom-full right-1/2 translate-x-1/2 mb-2 w-48 bg-gray-700 rounded-lg shadow-lg z-20 p-3 border border-gray-600">
                        <form onSubmit={handleJumpSubmit} className="flex items-center gap-2" aria-label="Chuyển trang nhanh">
                            <input
                                type="number"
                                value={jumpToPageInput}
                                onChange={handleJumpInputChange}
                                min="1"
                                max={totalPages}
                                className="w-full p-2 text-sm text-center bg-gray-800 border border-gray-600 rounded-md focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-gray-100"
                                aria-label="Nhập số trang để chuyển tới"
                            />
                            <Button type="submit" size="sm" variant="primary" className="h-full px-3">
                                {VIETNAMESE.goToPage}
                            </Button>
                        </form>
                    </div>
                )}
            </div>

            <Button
                onClick={onNext}
                disabled={disabled || currentPage >= totalPages}
                size="sm"
                variant="secondary"
                className="!px-3"
                title={VIETNAMESE.nextPage}
            >
                &rarr;
            </Button>
        </div>
    );
};

export default PaginationControls;
