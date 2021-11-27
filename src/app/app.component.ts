import { Component, OnInit, ViewChild, ElementRef, Injectable, AfterViewInit, AfterViewChecked } from "@angular/core";
import { FlatTreeControl } from "@angular/cdk/tree";
import {MatTreeFlatDataSource, MatTreeFlattener, MatTree, MatTreeNode} from "@angular/material/tree";
import * as cloneDeep from 'lodash/cloneDeep'
import {BehaviorSubject} from 'rxjs';


interface FoodNode {  
  name: string;
  children?: FoodNode[];
}

interface ExampleFlatNode {
  expandable: boolean;
  name: string;
  level: number;
}

const TREE_DATA: FoodNode[] = [
  {
    name: "Fruit",
    children: [ { name: "Banana" }, { name: "Fruit loops" }]
  },
  {
    name: "Vegetables",
    children: [{ name: "Pumpkins" }, { name: "Carrots" }]
  }
];

@Injectable()
export class ChecklistDatabase {
  dataChange = new BehaviorSubject<FoodNode[]>([]);

  get data(): FoodNode[] {  
    return this.dataChange.value;
  }

  constructor() {
    const data:FoodNode[]  = this.buildFileTree(TREE_DATA);
    this.dataChange.next(data);  
  }

  buildFileTree(data):FoodNode[] {
     let newArr = []
     for (let node of data) {
       let newNode = { ...node }
       console.log(newNode === node)
       newArr.push(newNode)
       if (node.children) {
         this.buildFileTree(node.children)
       }
     }
     return newArr
   }

  insertItem(parent: FoodNode, name: string) {
    if (parent.children) {
      parent.children.push({name: name} as FoodNode); 
      this.dataChange.next(this.data);
    }
  }

  deleteItem(node: FoodNode) {
    this.delete(node, this.data)
    this.dataChange.next(this.data);
  }

  delete(value: FoodNode, obj: FoodNode[]) {
    for (let i = obj.length - 1; i >= 0; i--) {
      if (obj[i].children) {
        for (let s=obj[i].children.length-1; s>=0;s--){
          if(obj[i].children[s].name.toUpperCase()==value.name.toUpperCase()){
          obj[i].children.splice(s,1)
          }
        }
      }
    }
  }

  updateItem(node: FoodNode, name: string) {  
    node.name = name; 
    this.dataChange.next(this.data);
  }
}

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.css"],
  providers: [ChecklistDatabase]

})
export class AppComponent  {
 
  flatNodeMap = new Map<ExampleFlatNode, FoodNode>(); 

  nestedNodeMap = new Map<FoodNode, ExampleFlatNode>();

  selectedParent: ExampleFlatNode | null = null;

  treeControl: FlatTreeControl<ExampleFlatNode>;

  treeFlattener: MatTreeFlattener<FoodNode, ExampleFlatNode>;

  dataSource: MatTreeFlatDataSource<FoodNode, ExampleFlatNode>;

  private treeDATA: FoodNode[];

  constructor(private _database: ChecklistDatabase) {
    this.treeFlattener = new MatTreeFlattener(
      this.transformer,
      this.getLevel,
      this.isExpandable,
      this.getChildren,
    );
    this.treeControl = new FlatTreeControl<ExampleFlatNode>(this.getLevel, this.isExpandable);
    this.dataSource = new MatTreeFlatDataSource(this.treeControl, this.treeFlattener);

    _database.dataChange.subscribe(data => {  
      this.dataSource.data = data;
      this.treeDATA = data;
    });
  }

getLevel = (node: ExampleFlatNode) => node.level;

isExpandable = (node: ExampleFlatNode) => node.expandable;

getChildren = (node: FoodNode): FoodNode[] => node.children;

hasChild = (_: number, _nodeData: ExampleFlatNode) => _nodeData.expandable;

hasNoContent = (_: number, _nodeData: ExampleFlatNode) => _nodeData.name === '';

transformer = (node: FoodNode, level: number) => {
  const existingNode = this.nestedNodeMap.get(node);
  const flatNode =
    existingNode && existingNode.name === node.name ? existingNode : {
      expandable: false,
      name: '',
      level: 0 
    };
  flatNode.name = node.name;
  flatNode.level = level;
  flatNode.expandable = node.children && !!node.children.length;
  this.flatNodeMap.set(flatNode, node);
  this.nestedNodeMap.set(node, flatNode);
  return flatNode;
};

addNewItem(node: ExampleFlatNode) {
  const parentNode = this.flatNodeMap.get(node); 
  this._database.insertItem(parentNode!, '');
  this.treeControl.expand(node);
}

saveNode(node: ExampleFlatNode, itemValue: string) {
  const nestedNode = this.flatNodeMap.get(node);
  this._database.updateItem(nestedNode!, itemValue);
}

removeItem(node: ExampleFlatNode) {
  const nestedNode = this.flatNodeMap.get(node);
  this._database.deleteItem(nestedNode!);
  this.treeControl.expand(node);
}

  applyFilter(value): void {
    value = value.toUpperCase().trim();
    const treeData = cloneDeep(this.treeDATA); 

    this.search(value, treeData);
    this.dataSource.data = treeData;
    this.treeControl.expandAll();
  }

  search(value: string, obj: FoodNode[]): boolean {
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
