import { Component, Injectable } from "@angular/core";
import { FlatTreeControl } from "@angular/cdk/tree";
import {
  MatTreeFlatDataSource,
  MatTreeFlattener,
} from "@angular/material/tree";
import * as cloneDeep from "lodash/cloneDeep";
import { BehaviorSubject } from "rxjs";

/* interfaces */
interface FoodNode {
  name: string;
  children?: FoodNode[];
}

interface ExampleFlatNode {
  expandable: boolean;
  name: string;
  level: number;
}

/* data to consume */
const TREE_DATA: FoodNode[] = [
  {
    name: "Fruits",
    children: [{ name: "Bananas" }, { name: "Figs" }],
  },
  {
    name: "Vegetables",
    children: [
      { name: "Pumpkins", children: [{ name: "White" }, { name: "Blue" }] },
      { name: "Carrots" },
    ],
  },
];

/* data service */
@Injectable({
  providedIn: "root",
})
export class ChecklistDatabase {
  dataChange = new BehaviorSubject<FoodNode[]>([]);

  get dataValue(): FoodNode[] {
    return this.dataChange.value;
  }

  constructor() {
    /* load initial data */
    const data: FoodNode[] = this.buildFileTree(TREE_DATA);
    this.dataChange.next(data);
  }

  /* initial tree build */
  private buildFileTree(nodes: FoodNode[]): FoodNode[] {
    let nodesArray = [];
    for (let node of nodes) {
      let newNode = { ...node };
      nodesArray.push(newNode);
      if (node.children) {
        this.buildFileTree(node.children);
      }
    }
    return nodesArray;
  }

  public insertItem(parent: FoodNode, name: string): void {
   if (parent.children) {
      parent.children.push({ name: name } as FoodNode);
      this.dataChange.next(this.dataValue);
    }
    else {
      parent.children= [{ name: name } as FoodNode];
      this.dataChange.next(this.dataValue);
    }
  }

  public deleteItem(node: FoodNode): void {
    this.delete(node, this.dataValue);
    this.dataChange.next(this.dataValue);
  }

  private delete(value: FoodNode, obj: FoodNode[]): void {
    for (let i = obj.length - 1; i >= 0; i--) {
      if (obj[i].name.toUpperCase()===value.name.toUpperCase()) {
        obj.splice(i, 1);
      } else {
        if (obj[i].children) {
          this.delete(value, obj[i].children);
        }
      }
    }
  }

  public updateItem(node: FoodNode, name: string): void {
    node.name = name;
    this.dataChange.next(this.dataValue);
  }
}

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.css"],
})

export class AppComponent {

  private flatToNestedNodeMap = new Map<ExampleFlatNode, FoodNode>();
  private nestedToFlatNodeMap = new Map<FoodNode, ExampleFlatNode>();
  public treeControl: FlatTreeControl<ExampleFlatNode>;
  private treeFlattener: MatTreeFlattener<FoodNode, ExampleFlatNode>;
  public dataSource: MatTreeFlatDataSource<FoodNode, ExampleFlatNode>;

  private backupTreeData: FoodNode[];

  constructor(private database: ChecklistDatabase) {
    this.treeFlattener = new MatTreeFlattener(
      this.transformer,
      this.getLevel,
      this.isExpandable,
      this.getChildren
    );
    this.treeControl = new FlatTreeControl<ExampleFlatNode>(
      this.getLevel,
      this.isExpandable
    );
    this.dataSource = new MatTreeFlatDataSource(
      this.treeControl,
      this.treeFlattener
    );

    database.dataChange.subscribe((data: FoodNode[]) => {
      this.dataSource.data = data;
      this.backupTreeData = data;
    });
  }

  private getLevel = (node: ExampleFlatNode) => node.level;

  private isExpandable = (node: ExampleFlatNode) => node.expandable;

  private getChildren = (node: FoodNode): FoodNode[] => node.children;

  public hasChild = (_: number, _nodeData: ExampleFlatNode) =>
    _nodeData.expandable;

  public hasNoContent = (_: number, _nodeData: ExampleFlatNode) =>
    _nodeData.name === "";

  private transformer = (node: FoodNode, level: number) => {
    const existingNode = this.nestedToFlatNodeMap.get(node);
    const flatNode =
      existingNode && existingNode.name === node.name
        ? existingNode
        : {
            expandable: false,
            name: "",
            level: 0,
          };

    flatNode.name = node.name;
    flatNode.level = level;
    flatNode.expandable = node.children && !!node.children.length;
    this.flatToNestedNodeMap.set(flatNode, node);
    this.nestedToFlatNodeMap.set(node, flatNode);
    return flatNode;
  };

  public addNewItem(node: ExampleFlatNode): void {
    const parentNode = this.flatToNestedNodeMap.get(node);
    this.database.insertItem(parentNode!, "");
    this.treeControl.expand(node);
  }

  public saveNode(node: ExampleFlatNode, itemValue: string): void {
    const nestedNode = this.flatToNestedNodeMap.get(node);
    this.database.updateItem(nestedNode!, itemValue);
    this.treeControl.expand(node);
  }

  public removeItem(node: ExampleFlatNode): void {
    const nestedNode = this.flatToNestedNodeMap.get(node);
    this.database.deleteItem(nestedNode!);
    this.treeControl.expand(node);
  }

  // clone backupTreeData for filter search use only so  main datasource remains untouched
  public applyFilter(value: string): void {
    value = value.toUpperCase().trim();
    const treeData = cloneDeep(this.backupTreeData);
    this.search(value, treeData);
    this.dataSource.data = treeData;
    this.treeControl.expandAll();
  }

  private search(value: string, obj: FoodNode[]): boolean {
    for (let i = obj.length - 1; i >= 0; i--) {
      if (obj[i].name.toUpperCase().indexOf(value) > -1) {
        if (obj[i].children) {
          this.search(value, obj[i].children);
        }
      } else {
        if (obj[i].children) {
          let parentCanBeEliminated = this.search(value, obj[i].children);
          if (parentCanBeEliminated === true) {
            obj.splice(i, 1);
          }
        } else {
          obj.splice(i, 1);
        }
      }
    }
    return obj.length == 0;
  }
}
