export namespace GearsTypes {

    export enum ItemType {
        Server = 0,
        Item = 1,
        ItemSelected = 2
    }

    export interface EntryGear {
        key: string,
        type: ItemType,
        id?: string,
        reader?: string,
        desc?: string
    }

}