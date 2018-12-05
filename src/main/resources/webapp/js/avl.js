/**
 * Creates a new AVL Tree node.
 *
 * @private
 * @param {Object} key The key of the new node.
 * @param {Object} value The value of the new node.
 */
var Node = function (key, value) {

    this.key = key;
    this.value = value;
    
    this.left = null;
    this.right = null;
    this.height = null;
    
    this.size = 1;

};

/**
 * Creates a new AVL Tree.
 *
 * @param {function} customCompare An optional custom compare function.
 */
var AvlTree = function (customCompare) {
    this._root = null;
    this._size = 0;

    if (customCompare) {
        this._compare = customCompare;
    }
};

/**
 * Compares two keys with each other.
 *
 * @private
 * @param {Object} a The first key to compare.
 * @param {Object} b The second key to compare.
 * @return {number} -1, 0 or 1 if a < b, a == b or a > b respectively.
 */
AvlTree.prototype._compare = function (a, b) {
    if (a > b) {
        return 1;
    }
    if (a < b) {
        return -1;
    }
    return 0;
};

/**
 * Inserts a new node with a specific key into the tree.
 *
 * @param {Object} key The key being inserted.
 * @param {Object} value The value being inserted.
 */
AvlTree.prototype.insert = function (key, value) {

    var node = new Node(key, value);

    this._root = this._insert(node, this._root, null, null);
    this._size++;

    return node;

};

/**
 * Inserts a new node with a specific key into the tree.
 *
 * @private
 * @param {Object} key The key being inserted.
 * @param {Node} root The root of the tree to insert in.
 * @return {Node} The new tree root.
 */
AvlTree.prototype._insert = function (node, root, prev, next) {

    // Perform regular BST insertion
    if (root === null) {

        node.prev = prev;
        node.next = next;

        if (prev)
            prev.next = node;

        if (next)
            next.prev = node;

        return node;

    }

    if (this._compare(node.key, root.key) < 0) {
        root.left = this._insert(node, root.left, prev, root);
    } else if (this._compare(node.key, root.key) > 0) {
        root.right = this._insert(node, root.right, root, next);
    } else {
        // It's a duplicate so insertion failed, decrement size to make up for it
        this._size--;
        return root;
    }

    // Update height and rebalance tree
    root.size = (root.left ? root.left.size : 0) + (root.right ? root.right.size : 0) + 1;
    root.height = Math.max(this.leftHeight(root), this.rightHeight(root)) + 1;
    
    var balanceState = this.getBalanceState(root);

    if (balanceState === BalanceState.UNBALANCED_LEFT) {
        if (this._compare(node.key, root.left.key) < 0) {
            // Left left case
            root = this.rotateRight(root);
        } else {
            // Left right case
            root.left = this.rotateLeft(root.left);
            return this.rotateRight(root);
        }
    }

    if (balanceState === BalanceState.UNBALANCED_RIGHT) {
        if (this._compare(node.key, root.right.key) > 0) {
            // Right right case
            root = this.rotateLeft(root);
        } else {
            // Right left case
            root.right = this.rotateRight(root.right);
            return this.rotateLeft(root);
        }
    }

    return root;

};

/**
 * Deletes a node with a specific key from the tree.
 *
 * @param {Object} key The key being deleted.
 */
AvlTree.prototype.delete = function (key) {
    this._root = this._delete(key, this._root);
    this._size--;
};

/**
 * Deletes a node with a specific key from the tree.
 *
 * @private
 * @param {Object} key The key being deleted.
 * @param {Node} root The root of the tree to delete from.
 * @return {Node} The new tree root.
 */
AvlTree.prototype._delete = function (key, root) {
    // Perform regular BST deletion
    if (root === null) {
        this._size++;
        return root;
    }

    if (this._compare(key, root.key) < 0) {
        // The key to be deleted is in the left sub-tree
        root.left = this._delete(key, root.left);
    } else if (this._compare(key, root.key) > 0) {
        // The key to be deleted is in the right sub-tree
        root.right = this._delete(key, root.right);
    } else {
        // root is the node to be deleted

        if (root.left && root.right) {

            // Node has 2 children, get the in-order successor
            var inOrderSuccessor = minValueNode(root.right);

            root.key = inOrderSuccessor.key;
            root.value = inOrderSuccessor.value;

            root.right = this._delete(inOrderSuccessor.key, root.right);

        } else {

            if (root.prev)
                root.prev.next = root.next;

            if (root.next)
                root.next.prev = root.prev;

            if (!root.left && !root.right) 
                root = null;
            else if (!root.left && root.right)
                root = root.right;
            else 
                root = root.left;
                        
        }

    }

    if (root === null) {
        return root;
    }

    // Update height and rebalance tree
    root.height = Math.max(this.leftHeight(root), this.rightHeight(root)) + 1;
    root.size = (root.left ? root.left.size : 0) + (root.right ? root.right.size : 0) + 1;
    var balanceState = this.getBalanceState(root);

    if (balanceState === BalanceState.UNBALANCED_LEFT) {
        // Left left case
        if (this.getBalanceState(root.left) === BalanceState.BALANCED ||
            this.getBalanceState(root.left) === BalanceState.SLIGHTLY_UNBALANCED_LEFT) {
            return this.rotateRight(root);
        }
        // Left right case
        if (this.getBalanceState(root.left) === BalanceState.SLIGHTLY_UNBALANCED_RIGHT) {
            root.left = this.rotateLeft(root.left);
            return this.rotateRight(root);
        }
    }

    if (balanceState === BalanceState.UNBALANCED_RIGHT) {
        // Right right case
        if (this.getBalanceState(root.right) === BalanceState.BALANCED ||
            this.getBalanceState(root.right) === BalanceState.SLIGHTLY_UNBALANCED_RIGHT) {
            return this.rotateLeft(root);
        }
        // Right left case
        if (this.getBalanceState(root.right) === BalanceState.SLIGHTLY_UNBALANCED_LEFT) {
            root.right = this.rotateRight(root.right);
            return this.rotateLeft(root);
        }
    }

    return root;
};

AvlTree.prototype.getRankedNode = function (rank) {

    if (this._root === null)
        return null;

    return this._getRanked(rank, this._root);

}

AvlTree.prototype.getRanked = function (rank) {

    var node = this.getRankedNode(rank, this._root);

    if (node)
        return node.value;

}

AvlTree.prototype._getRanked = function(rank, root) {

    if (!root)
        return null;

    var rootRank = (root.left ? root.left.size + 1 : 1);

    if (rootRank == rank)
        return root;
    else if (rank < rootRank)
        return this._getRanked(rank, root.left)
    else
        return this._getRanked(rank - rootRank, root.right);
    
}

AvlTree.prototype.rank = function(key) {

    if (this._root === null)
        return null;
        
    return this._rank(key, this._root, 0);
}

AvlTree.prototype._rank = function(key, root, left) {
    
    if (!root)
        return null;

    if (root.key == key)
        return left + (root.left ? root.left.size : 0) + 1;
    else if (key < root.key) 
        return this._rank(key, root.left, left);
    else
        return this._rank(key, root.right, left + (root.left ? root.left.size : 0) + 1);

}

AvlTree.prototype.getNode = function(key) {

    if (this._root === null) 
        return null;
    
    return this._get(key, this._root);

}

/**
 * Gets the value of a node within the tree with a specific key.
 *
 * @param {Object} key The key being searched for.
 * @return {Object} The value of the node or null if it doesn't exist.
 */
AvlTree.prototype.get = function (key) {

    var node = this.getNode(key);

    if (node)
        return node.value;
    else
        return null;

};

/**
 * Gets the value of a node within the tree with a specific key.
 *
 * @private
 * @param {Object} key The key being searched for.
 * @param {Node} root The root of the tree to search in.
 * @return {Object} The value of the node or null if it doesn't exist.
 */
AvlTree.prototype._get = function (key, root) {

    if (key === root.key) {
        return root;
    }

    if (this._compare(key, root.key) < 0) {

        if (!root.left)
            return null;
        
        return this._get(key, root.left);

    }

    if (!root.right)
        return null;
    
    return this._get(key, root.right);

};

/**
 * Gets whether a node with a specific key is within the tree.
 *
 * @param {Object} key The key being searched for.
 * @return {boolean} Whether a node with the key exists.
 */
AvlTree.prototype.contains = function (key) {
    if (this._root === null) {
        return false;
    }

    return !!this._get(key, this._root);
};

/**
 * @return {Object} The minimum key in the tree.
 */
AvlTree.prototype.findMinimum = function () {
    return minValueNode(this._root).key;
};

/**
 * Gets the minimum value node, rooted in a particular node.
 *
 * @private
 * @param {Node} root The node to search.
 * @return {Node} The node with the minimum key in the tree.
 */
function minValueNode(root) {
    var current = root;
    while (current.left) {
        current = current.left;
    }
    return current;
}

/**
 * @return {Object} The maximum key in the tree.
 */
AvlTree.prototype.findMaximum = function () {
    return maxValueNode(this._root).key;
};

/**
 * Gets the maximum value node, rooted in a particular node.
 *
 * @private
 * @param {Node} root The node to search.
 * @return {Node} The node with the maximum key in the tree.
 */
function maxValueNode(root) {
    var current = root;
    while (current.right) {
        current = current.right;
    }
    return current;
}

/**
 * @return {number} The size of the tree.
 */
AvlTree.prototype.size = function () {
    return this._size;
};

/**
 * @return {boolean} Whether the tree is empty.
 */
AvlTree.prototype.isEmpty = function () {
    return this._size === 0;
};

/**
 * Performs a right rotate on this node.
 *
 *       b                           a
 *      / \                         / \
 *     a   e -> b.rotateRight() -> c   b
 *    / \                             / \
 *   c   d                           d   e
 *
 * @return {Node} The root of the sub-tree; the node where this node used to be.
 */
AvlTree.prototype.rotateRight = function (node) {

    var other = node.left;
    node.left = other.right;
    // Augmentation with subtree size
    node.size = (node.left ? node.left.size : 0) + (node.right ? node.right.size : 0) + 1;

    other.right = node;
    // Augmentation with subtree size
    other.size = (other.left ? other.left.size : 0) + node.size + 1;

    node.height = Math.max(this.leftHeight(node), this.rightHeight(node)) + 1;
    other.height = Math.max(this.leftHeight(other), node.height) + 1;
    return other;

};

/**
 * Performs a left rotate on this node.
 *
 *     a                              b
 *    / \                            / \
 *   c   b   -> a.rotateLeft() ->   a   e
 *      / \                        / \
 *     d   e                      c   d
 *
 * @return {Node} The root of the sub-tree; the node where this node used to be.
 */
AvlTree.prototype.rotateLeft = function (node) {

    var other = node.right;
    node.right = other.left;
    // Augmentation with subtree size
    node.size = (node.right ? node.right.size : 0) + (node.left ? node.left.size : 0) + 1;

    other.left = node;
    // Augmentation with subtree size
    other.size = node.size + (other.right ? other.right.size : 0) + 1;

    node.height = Math.max(this.leftHeight(node), this.rightHeight(node)) + 1;
    other.height = Math.max(this.rightHeight(other), node.height) + 1;
    return other;

};

/**
 * Convenience function to get the height of the left child of the node,
 * returning -1 if the node is null.
 *
 * @return {number} The height of the left child, or -1 if it doesn't exist.
 */
AvlTree.prototype.leftHeight = function (node) {
    if (!node.left) {
        return -1;
    }
    return node.left.height;
};

/**
 * Convenience function to get the height of the right child of the node,
 * returning -1 if the node is null.
 *
 * @return {number} The height of the right child, or -1 if it doesn't exist.
 */
AvlTree.prototype.rightHeight = function (node) {
    if (!node.right) {
        return -1;
    }
    return node.right.height;
};

/**
 * Represents how balanced a node's left and right children are.
 *
 * @private
 */
var BalanceState = {
    UNBALANCED_RIGHT: 1,
    SLIGHTLY_UNBALANCED_RIGHT: 2,
    BALANCED: 3,
    SLIGHTLY_UNBALANCED_LEFT: 4,
    UNBALANCED_LEFT: 5
};

/**
 * Gets the balance state of a node, indicating whether the left or right
 * sub-trees are unbalanced.
 *
 * @private
 * @param {Node} node The node to get the difference from.
 * @return {BalanceState} The BalanceState of the node.
 */
AvlTree.prototype.getBalanceState = function (node) {
    var heightDifference = this.leftHeight(node) - this.rightHeight(node);
    switch (heightDifference) {
        case -2: return BalanceState.UNBALANCED_RIGHT;
        case -1: return BalanceState.SLIGHTLY_UNBALANCED_RIGHT;
        case 1: return BalanceState.SLIGHTLY_UNBALANCED_LEFT;
        case 2: return BalanceState.UNBALANCED_LEFT;
        default: return BalanceState.BALANCED;
    }
}
