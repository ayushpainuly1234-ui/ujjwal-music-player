const problems = [

    {
        id: 1,
        title: "Two Sum",
        difficulty: "Easy",
        description:
            "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target."
    },

    {
        id: 2,
        title: "Reverse Linked List",
        difficulty: "Easy",
        description:
            "Given the head of a singly linked list, reverse the list and return the reversed list."
    },

    {
        id: 3,
        title: "Longest Substring Without Repeating Characters",
        difficulty: "Medium",
        description:
            "Given a string, find the length of the longest substring without repeating characters."
    },

    {
        id: 4,
        title: "Binary Tree Maximum Path Sum",
        difficulty: "Hard",
        description:
            "Given the root of a binary tree, return the maximum path sum."
    },

    {
        id: 5,
        title: "Valid Parentheses",
        difficulty: "Easy",
        description:
            "Given a string containing brackets, determine if the input string is valid."
    }

];


const problemList =
    document.getElementById("problemList");

const search =
    document.getElementById("search");

const difficulty =
    document.getElementById("difficulty");

const codeEditor =
    document.getElementById("codeEditor");

const result =
    document.getElementById("result");


/* Display Problems */

function displayProblems(data) {

    problemList.innerHTML = "";

    data.forEach(problem => {

        const div = document.createElement("div");

        div.className = "problem";

        div.innerHTML = `

            <h3>
                ${problem.id}. ${problem.title}
            </h3>

            <p class="${problem.difficulty.toLowerCase()}">
                ${problem.difficulty}
            </p>

        `;

        div.addEventListener("click", () => {

            loadProblem(problem);

        });

        problemList.appendChild(div);

    });

}


displayProblems(problems);


/* Load Problem */

function loadProblem(problem) {

    document.getElementById("problemTitle")
        .innerText = problem.title;

    document.getElementById("problemDifficulty")
        .innerText = problem.difficulty;

    document.getElementById("problemDescription")
        .innerText = problem.description;

}


/* Search */

search.addEventListener("input", filterProblems);

difficulty.addEventListener("change", filterProblems);


function filterProblems() {

    const searchValue =
        search.value.toLowerCase();

    const difficultyValue =
        difficulty.value;

    const filtered =
        problems.filter(problem => {

            const matchesSearch =
                problem.title
                    .toLowerCase()
                    .includes(searchValue);

            const matchesDifficulty =
                difficultyValue === "all" ||
                problem.difficulty === difficultyValue;

            return matchesSearch &&
                   matchesDifficulty;

        });

    displayProblems(filtered);

}


/* Run */

document.getElementById("runBtn")
    .addEventListener("click", () => {

        result.className = "result success";

        result.style.display = "block";

        result.innerText =
            "✓ Test Cases Passed";

    });


/* Submit */

document.getElementById("submitBtn")
    .addEventListener("click", () => {

        result.className = "result success";

        result.style.display = "block";

        result.innerText =
            "✓ Accepted — All Test Cases Passed";

    });


/* Reset */

document.getElementById("resetBtn")
    .addEventListener("click", () => {

        codeEditor.value = `function twoSum(nums, target) {

    // Write your code here

}`;

        result.style.display = "none";

    });