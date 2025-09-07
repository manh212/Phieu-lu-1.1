// types/features/auction.ts
import type { Item, Slave } from '../entities';

export type AuctionItem = Item & { 
    startingPrice: number; 
    currentBid: number; 
    buyoutPrice?: number; 
    highestBidderId?: string;
    ownerId?: 'player' | 'system'; 
};
export interface AuctionNPC { id: string; name: string; realm: string; currency: number; }
export interface AuctionCommentaryEntry { id: string; text: string; timestamp: number; }
export interface AuctionState { 
    items: AuctionItem[]; 
    auctionNPCs: AuctionNPC[]; 
    currentItemIndex: number; 
    isOpen: boolean; 
    auctioneerCommentary: AuctionCommentaryEntry[]; 
    lastBidTime: number; 
    auctioneerCallCount: number;
    locationId: string;
}

export type AuctionSlave = Slave & {
    startingPrice: number; 
    currentBid: number; 
    buyoutPrice?: number; 
    highestBidderId?: string;
    ownerId?: 'player' | 'system'; 
};

export interface SlaveAuctionState { 
    items: AuctionSlave[]; 
    auctionNPCs: AuctionNPC[]; 
    currentItemIndex: number; 
    isOpen: boolean; 
    auctioneerCommentary: AuctionCommentaryEntry[]; 
    lastBidTime: number; 
    auctioneerCallCount: number;
    locationId: string;
}
