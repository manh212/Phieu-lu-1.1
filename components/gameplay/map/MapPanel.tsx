import React, { useState, useRef, MouseEvent } from 'react';
import { KnowledgeBase, GameLocation, GameScreen, Region, LocationConnection, FindLocationParams } from '@/types/index';
import InteractiveMap from './InteractiveMap';
import Button from '@/components/ui/Button';
import { VIETNAMESE } from '@/constants/index';
import { MAP_COLORS, MAP_SIZES } from './mapConstants';
import Modal from '@/components/ui/Modal';
import * as GameTemplates from '@/types/index';
import * as LocationIcons from './mapIcons';
import FindLocationModal from './FindLocationModal'; // New Import
import { useGame } from '@/hooks/useGame'; // New Import

interface MapPanelProps {
  knowledgeBase: KnowledgeBase;
  setCurrentScreen: (screen: GameScreen) => void;
}

const LegendItem: React.FC<{ color?: string; icon?: React.ReactNode; label: string }> = ({ color, icon, label }) => (
  <div className="flex items-center space-x-2">
    {icon ? (
        <span style={{ width: MAP_SIZES.LEGEND_ITEM_SIZE, height: MAP_SIZES.LEGEND_ITEM_SIZE }} className="inline-block flex-shrink-0">
            {icon}
        </span>
    ) : (
      <span
        style={{ backgroundColor: color, width: MAP_SIZES.LEGEND_ITEM_SIZE, height: MAP_SIZES.LEGEND_ITEM_SIZE }}
        className="inline-block rounded-full border border-gray-600 flex-shrink-0"
      ></span>
    )}
    <span className="text-xs text-gray-300">{label}</span>
  </div>
);

export const MapPanel: React.FC<MapPanelProps> = ({
  knowledgeBase,
  setCurrentScreen,
}) => {
  const game = useGame(); // Use context
  const [selectedLocationDetails, setSelectedLocationDetails] = useState<GameLocation | null>(null);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [locationHistory, setLocationHistory] = useState<GameLocation[]>([]);
  const [isLegendOpen, setIsLegendOpen] = useState(false);
  const [isFindModalOpen, setIsFindModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const [viewMatrix, setViewMatrix] = useState({
    scale: 1,
    translateX: 0,
    translateY: 0,
  });
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [interaction, setInteraction] = useState<{
    type: 'pan' | 'drag';
    targetId?: string;
    startX: number;
    startY: number;
  } | null>(null);

  const handleNodeMouseDown = (e: MouseEvent<SVGSVGElement>, locationId: string) => {
    if (!isEditMode) return;
    e.stopPropagation(); // Prevent pan from starting
    setInteraction({ type: 'drag', targetId: locationId, startX: e.clientX, startY: e.clientY });
    if (svgRef.current) svgRef.current.style.cursor = 'grabbing';
  };

  const onSvgMouseDown = (e: MouseEvent<SVGSVGElement>) => {
    // This only fires if a node's onMouseDown doesn't stop propagation.
    // This is for panning the background.
    setInteraction({ type: 'pan', startX: e.clientX, startY: e.clientY });
    if (svgRef.current) svgRef.current.style.cursor = 'grabbing';
  };

  const onMouseUp = () => {
    setInteraction(null);
    if (svgRef.current) svgRef.current.style.cursor = isEditMode ? 'default' : 'grab';
  };

  const onMouseMove = (e: MouseEvent<SVGSVGElement>) => {
    if (!interaction || !svgRef.current) return;
    
    // Use requestAnimationFrame for smoother updates
    requestAnimationFrame(() => {
        if (!interaction) return; // Re-check inside frame
        const dx = e.clientX - interaction.startX;
        const dy = e.clientY - interaction.startY;
    
        if (interaction.type === 'pan') {
            setViewMatrix(prev => ({
                ...prev,
                translateX: prev.translateX + dx,
                translateY: prev.translateY + dy,
            }));
        } else if (interaction.type === 'drag' && interaction.targetId) {
            const CTM = svgRef.current?.getScreenCTM();
            if (CTM) {
                const newX = (e.clientX - CTM.e) / CTM.a;
                const newY = (e.clientY - CTM.f) / CTM.d;
                game.updateLocationCoordinates(interaction.targetId, newX, newY);
            }
        }

        // Update start position for next delta calculation
        setInteraction(prev => (prev ? { ...prev, startX: e.clientX, startY: e.clientY } : null));
    });
  };

  const onWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    if (!svgRef.current) return;
    const scaleAmount = 0.1;
    const newScale = e.deltaY > 0 ? viewMatrix.scale * (1 - scaleAmount) : viewMatrix.scale * (1 + scaleAmount);
    const clampedScale = Math.max(0.2, Math.min(newScale, 5));
    
    const svgPoint = svgRef.current.createSVGPoint();
    svgPoint.x = e.clientX;
    svgPoint.y = e.clientY;
    
    const pointInSvg = svgPoint.matrixTransform(svgRef.current.getScreenCTM()?.inverse());
    
    const newTranslateX = pointInSvg.x - (pointInSvg.x - viewMatrix.translateX) * (clampedScale / viewMatrix.scale);
    const newTranslateY = pointInSvg.y - (pointInSvg.y - viewMatrix.translateY) * (clampedScale / viewMatrix.scale);

    setViewMatrix({
        scale: clampedScale,
        translateX: newTranslateX,
        translateY: newTranslateY,
    });
  };

  const zoom = (factor: number) => {
    const newScale = Math.max(0.2, Math.min(viewMatrix.scale * factor, 5));
    const centerX = MAP_SIZES.SVG_VIEWBOX_WIDTH / 2;
    const centerY = MAP_SIZES.SVG_VIEWBOX_HEIGHT / 2;
    const newTranslateX = centerX - (centerX - viewMatrix.translateX) * (newScale / viewMatrix.scale);
    const newTranslateY = centerY - (centerY - viewMatrix.translateY) * (newScale / viewMatrix.scale);
    setViewMatrix({ scale: newScale, translateX: newTranslateX, translateY: newTranslateY });
  };

  const resetView = () => setViewMatrix({ scale: 1, translateX: 0, translateY: 0 });

  const handleLocationClick = (locationId: string) => {
    const location = knowledgeBase.discoveredLocations.find(loc => loc.id === locationId);
    if (location) {
      setLocationHistory([location]);
      setSelectedLocationDetails(location);
      setIsLocationModalOpen(true);
    }
  };
  
  const handleSubLocationClick = (subLocation: GameLocation) => {
    setLocationHistory(prev => [...prev, subLocation]);
    setSelectedLocationDetails(subLocation);
  };

  const handleModalBack = () => {
    const newHistory = [...locationHistory];
    newHistory.pop();
    if (newHistory.length > 0) {
      setLocationHistory(newHistory);
      setSelectedLocationDetails(newHistory[newHistory.length - 1]);
    }
  };

  const handleCloseModal = () => {
    setIsLocationModalOpen(false);
    setSelectedLocationDetails(null);
    setLocationHistory([]);
  };

  const handleStartSearch = (params: FindLocationParams) => {
    game.handleFindLocation(params);
    setIsFindModalOpen(false);
  };
  
  const currentLocation = knowledgeBase.discoveredLocations.find(loc => loc.id === knowledgeBase.currentLocationId);
  const getRegionName = (regionId?: string): string | undefined => {
    if (!regionId) return undefined;
    return knowledgeBase.discoveredRegions.find(r => r.id === regionId)?.name;
  };

  const transformString = `translate(${viewMatrix.translateX} ${viewMatrix.translateY}) scale(${viewMatrix.scale})`;
  const viewBox = `0 0 ${MAP_SIZES.SVG_VIEWBOX_WIDTH} ${MAP_SIZES.SVG_VIEWBOX_HEIGHT}`;

  const iconLegendData = [
    { icon: <LocationIcons.PlayerIcon className="text-white"/>, label: VIETNAMESE.legendCurrentLocation },
    { icon: <LocationIcons.VillageIcon className="text-white"/>, label: VIETNAMESE.locationType_VILLAGE },
    { icon: <LocationIcons.TownIcon className="text-white"/>, label: VIETNAMESE.locationType_TOWN },
    { icon: <LocationIcons.CityIcon className="text-white"/>, label: VIETNAMESE.locationType_CITY },
    { icon: <LocationIcons.CapitalIcon className="text-white"/>, label: VIETNAMESE.locationType_CAPITAL },
    { icon: <LocationIcons.SectIcon className="text-white"/>, label: VIETNAMESE.locationType_SECT_CLAN },
    { icon: <LocationIcons.ShopIcon className="text-white"/>, label: VIETNAMESE.locationType_SHOP },
    { icon: <LocationIcons.InnIcon className="text-white"/>, label: VIETNAMESE.locationType_INN },
    { icon: <LocationIcons.ForestIcon className="text-white"/>, label: VIETNAMESE.locationType_FOREST },
    { icon: <LocationIcons.MountainIcon className="text-white"/>, label: VIETNAMESE.locationType_MOUNTAIN },
    { icon: <LocationIcons.CaveIcon className="text-white"/>, label: VIETNAMESE.locationType_CAVE },
    { icon: <LocationIcons.DungeonIcon className="text-white"/>, label: VIETNAMESE.locationType_DUNGEON },
    { icon: <LocationIcons.RuinIcon className="text-white"/>, label: VIETNAMESE.locationType_RUIN },
    { icon: <LocationIcons.WaterIcon className="text-white"/>, label: VIETNAMESE.locationType_RIVER_LAKE },
    { icon: <LocationIcons.LandmarkIcon className="text-white"/>, label: VIETNAMESE.locationType_LANDMARK },
    { icon: <LocationIcons.DefaultIcon className="text-white"/>, label: VIETNAMESE.locationType_DEFAULT },
  ];

  const colorLegendData = [
      { color: MAP_COLORS.CURRENT_LOCATION_NODE, label: VIETNAMESE.legendCurrentLocation },
      { color: MAP_COLORS.SAFE_ZONE_NODE, label: VIETNAMESE.legendSafeZoneNode },
      { color: MAP_COLORS.DISCOVERED_LOCATION_NODE, label: VIETNAMESE.legendDiscoveredLocationNode },
      { color: MAP_COLORS.UNDISCOVERED_HINT_NODE, label: VIETNAMESE.legendUnvisitedLocation },
      { color: MAP_COLORS.PATH_DISCOVERED, label: VIETNAMESE.legendPathDiscovered },
  ];

  const subLocationsForSelected = selectedLocationDetails 
    ? knowledgeBase.discoveredLocations.filter(loc => loc.parentLocationId === selectedLocationDetails?.id)
    : [];

  return (
    <>
    <div className="h-screen flex flex-col bg-gray-800 p-2 sm:p-3 text-gray-100">
      <header className="mb-2 sm:mb-3 flex justify-between items-center flex-shrink-0">
        <h1 className="text-xl sm:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-teal-500 to-cyan-600">
          Bản Đồ Thế Giới
        </h1>
        <div className="flex items-center gap-2">
            <Button onClick={() => setIsEditMode(prev => !prev)} size="sm" variant={isEditMode ? "primary" : "secondary"} title={isEditMode ? "Tắt chế độ sửa" : "Bật chế độ sửa tọa độ"} className={`${isEditMode ? 'bg-orange-600 hover:bg-orange-700 ring-2 ring-orange-400' : 'border-orange-500 text-orange-300 hover:bg-orange-700/50'}`}>
                {isEditMode ? "Tắt Sửa" : "Sửa Vị Trí"}
            </Button>
            <Button onClick={() => setIsFindModalOpen(true)} size="sm" variant="secondary" title={VIETNAMESE.findLocationButtonTitle}>
                {VIETNAMESE.findLocationButtonLabel}
            </Button>
            <Button onClick={() => setIsLegendOpen(!isLegendOpen)} size="sm" variant="secondary" title={VIETNAMESE.mapLegendTitle}>
                Chú Giải
            </Button>
            <Button variant="secondary" onClick={() => setCurrentScreen(GameScreen.Gameplay)}>
                {VIETNAMESE.goBackButton}
            </Button>
        </div>
      </header>

      <div className="flex-grow bg-gray-900 rounded-lg shadow-xl border border-gray-700 overflow-hidden relative">
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          viewBox={viewBox}
          className="bg-gray-800"
          onMouseDown={onSvgMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onWheel={onWheel}
          style={{ cursor: interaction ? 'grabbing' : (isEditMode ? 'default' : 'grab') }}
        >
          <InteractiveMap
            locations={knowledgeBase.discoveredLocations}
            currentLocationId={knowledgeBase.currentLocationId || null}
            onLocationClick={handleLocationClick}
            transform={transformString}
            isEditMode={isEditMode}
            onNodeMouseDown={handleNodeMouseDown}
          />
        </svg>

        {/* Zoom Controls */}
        <div className="absolute bottom-4 right-4 flex flex-col gap-2">
            <Button onClick={() => zoom(1.2)} size="sm" variant="secondary" title={VIETNAMESE.zoomIn} className="!p-2 aspect-square">+</Button>
            <Button onClick={() => zoom(0.8)} size="sm" variant="secondary" title={VIETNAMESE.zoomOut} className="!p-2 aspect-square">-</Button>
            <Button onClick={resetView} size="sm" variant="secondary" title={VIETNAMESE.resetView} className="!p-2 aspect-square">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM13.5 10.5h-6" />
                </svg>
            </Button>
        </div>

        {/* Legend */}
        {isLegendOpen && (
            <div className="absolute top-4 left-4 bg-gray-900/80 p-4 rounded-lg border border-gray-600 backdrop-blur-sm space-y-4 max-h-[80%] overflow-y-auto custom-scrollbar">
               <div>
                  <h3 className="font-semibold text-gray-200 mb-2">{VIETNAMESE.mapIconLegendTitle}</h3>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                    {iconLegendData.map(item => <LegendItem key={item.label} icon={item.icon} label={item.label} />)}
                  </div>
               </div>
               <div className="border-t border-gray-700 pt-3">
                  <h3 className="font-semibold text-gray-200 mb-2">{VIETNAMESE.mapColorLegendTitle}</h3>
                  <div className="grid grid-cols-1 gap-1.5">
                    {colorLegendData.map(item => <LegendItem key={item.label} color={item.color} label={item.label} />)}
                  </div>
               </div>
            </div>
        )}
      </div>
    </div>
    
    {isLocationModalOpen && selectedLocationDetails && (
        <Modal 
            isOpen={isLocationModalOpen} 
            onClose={handleCloseModal} 
            title={locationHistory[0].name}
        >
            <div className="space-y-4">
                {locationHistory.length > 1 && (
                    <Button onClick={handleModalBack} variant="ghost" size="sm" className="mb-2">
                        &larr; Quay lại {locationHistory[locationHistory.length - 2].name}
                    </Button>
                )}
                <h3 className="text-xl font-bold text-indigo-300">{selectedLocationDetails.name}</h3>
                <p className="text-sm italic text-gray-400">{selectedLocationDetails.description}</p>
                
                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-700 text-sm">
                    <p><strong className="text-gray-400">Loại:</strong> {selectedLocationDetails.locationType}</p>
                    <p><strong className="text-gray-400">Vùng:</strong> {getRegionName(selectedLocationDetails.regionId) || 'Chưa rõ'}</p>
                    <p><strong className="text-gray-400">An toàn:</strong> {selectedLocationDetails.isSafeZone ? 'Có' : 'Không'}</p>
                    <p><strong className="text-gray-400">Trạng thái:</strong> {selectedLocationDetails.visited ? 'Đã đến' : 'Chưa đến'}</p>
                </div>

                {subLocationsForSelected.length > 0 && (
                     <div className="pt-3 border-t border-gray-700">
                        <h4 className="font-semibold text-gray-300 mb-2">Các Khu Vực Phụ:</h4>
                        <ul className="space-y-1">
                            {subLocationsForSelected.map(subLoc => (
                                <li key={subLoc.id}>
                                    <button 
                                        onClick={() => handleSubLocationClick(subLoc)}
                                        className="w-full text-left p-2 rounded text-indigo-300 hover:bg-gray-700/50"
                                    >
                                        - {subLoc.name}
                                    </button>
                                </li>
                            ))}
                        </ul>
                     </div>
                )}
            </div>
        </Modal>
    )}
    <FindLocationModal
        isOpen={isFindModalOpen}
        onClose={() => setIsFindModalOpen(false)}
        onSearch={handleStartSearch}
        isLoading={game.isLoadingApi}
    />
    </>
  );
};
