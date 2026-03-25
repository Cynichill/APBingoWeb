import { setupMenu } from "./menu";
import { connectToAP, type BingoSlotData } from "./ap";
import { createBoard } from "./board";


setupMenu(async (host, port, slot) => {
    try {
        const { slotdata } = await connectToAP<BingoSlotData>(host, port, slot);

        createBoard(slotdata.boardSize, slotdata.boardLocations);
    } catch (err) {
        console.error("Login failed", err);
    }
});