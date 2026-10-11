const b = await eda.dmt_Board.getAllBoardsInfo();
return b.map(x => ({ 板名: x.name, boardUuid: x.uuid,
  PCB: x.pcb && (x.pcb.name + ' / ' + x.pcb.uuid),
  原理图: x.schematic && (x.schematic.name + ' / ' + x.schematic.uuid) }));
